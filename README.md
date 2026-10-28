#  Cluster MongoDB con Sharding en Docker

Este repositorio documenta paso a paso la configuración de un **cluster de MongoDB con sharding** sobre Docker: config server, dos shards y un router `mongos`, además de la definición de la *shard key* de una colección.

##  Requisitos

- [Docker](https://www.docker.com/products/docker-desktop) y Docker Compose
- `mongosh` (en esta práctica se usa el que viene dentro de los contenedores, vía `docker exec`)
- Versiones utilizadas: **MongoDB 7.0.45** y **mongosh 2.14.0**

---

##  Arquitectura

| Servicio      | Contenedor  | Puerto interno | Puerto en el host | Replica Set       |
|---------------|-------------|----------------|-------------------|-------------------|
| Config server | `configsvr` | 27017          | 28017             | `configReplSet`   |
| Shard 1       | `shard1`    | 27018          | 28018             | `shard1ReplSet`   |
| Shard 2       | `shard2`    | 27019          | 28019             | `shard2ReplSet`   |
| Router        | `mongos`    | 27020          | 28020             | —                 |

```
                      ┌──────────────┐
   Cliente ─────────► │    mongos    │ :27020
                      └──────┬───────┘
          ┌──────────────────┼──────────────────┐
          ▼                  ▼                  ▼
   ┌─────────────┐     ┌──────────┐       ┌──────────┐
   │  configsvr  │     │  shard1  │       │  shard2  │
   │   :27017    │     │  :27018  │       │  :27019  │
   │ (metadatos) │     └──────────┘       └──────────┘
   └─────────────┘
```

- Cada shard y el config server es un **replica set** (de un solo miembro, suficiente para fines didácticos).
- Las aplicaciones y el shell se conectan **solo a `mongos`**, que consulta los metadatos en el config server y enruta cada operación al shard correspondiente.

---

##  Estructura del repositorio

```
.
├── README.md                 # Documentación técnica del cluster
├── docker-compose.yml        # Definición del cluster
└── Reporte.pdf               # Reporte de la práctica
```

---

##  Modelo de datos

Se utiliza la base de datos **`dbemp`** con la colección **`emp`** (empleados). Cada documento incluye el departamento como **subdocumento embebido** (`dept`).

```js
{
  empno: 7369,
  ename: "SMITH",
  job: "CLERK",
  mgr: 7902,
  hiredate: ISODate("1980-12-17T00:00:00.000Z"),
  sal: 800,
  comm: null,
  dept: { deptno: 20, dname: "RESEARCH", loc: "DALLAS" }
}
```

| Campo      | Descripción                                   |
|------------|-----------------------------------------------|
| `empno`    | Número de empleado (identificador de negocio) |
| `ename`    | Nombre                                        |
| `job`      | Puesto                                        |
| `mgr`      | `empno` del jefe directo                      |
| `hiredate` | Fecha de contratación                         |
| `sal`      | Salario                                       |
| `comm`     | Comisión (puede ser `null`)                   |
| `dept`     | Subdocumento con `deptno`, `dname` y `loc`    |

---

##  Shard key

```js
{ empno: "hashed" }
```

**¿Por qué `empno` con hash?**

- `empno` tiene **alta cardinalidad**: cada empleado tiene un valor distinto.
- Con un índice *hashed* los documentos se distribuyen de forma **uniforme** entre los shards, aunque los valores de `empno` sean consecutivos (evita "hot spots" que se darían con una clave ascendente en rangos).
- Las consultas por igualdad sobre `empno` se **dirigen a un solo shard** (*targeted query*).

**Contrapartida:** las consultas por rango sobre `empno` (por ejemplo `empno > 7500`) y las que no incluyen la shard key se envían a **todos los shards** (*scatter-gather*).

> Al shardear una colección vacía con clave *hashed*, MongoDB crea chunks iniciales repartidos entre los shards (por defecto 2 por shard), por eso la distribución es pareja desde el inicio aunque la colección sea pequeña.

---

##  Operaciones de configuración

### Paso 1: Levantar los contenedores

```bash
git clone <URL-DE-ESTE-REPOSITORIO>
cd <nombre-del-repositorio>
docker compose up -d
```

Se crean los volúmenes, la red y los contenedores `configsvr`, `shard1`, `shard2` y `mongos`.

### Paso 2: Inicializar los replica sets

**2.1 Config server**

```bash
docker exec -it configsvr mongosh
```

```js
rs.initiate({
  _id: "configReplSet",
  configsvr: true,
  members: [{ _id: 0, host: "configsvr:27017" }]
})
```

```js
exit
```

**2.2 Shard 1**

```bash
docker exec -it shard1 mongosh --port 27018
```

```js
rs.initiate({
  _id: "shard1ReplSet",
  members: [{ _id: 0, host: "shard1:27018" }]
})
```

```js
exit
```

**2.3 Shard 2**

```bash
docker exec -it shard2 mongosh --port 27019
```

```js
rs.initiate({
  _id: "shard2ReplSet",
  members: [{ _id: 0, host: "shard2:27019" }]
})
```

```js
exit
```

### Paso 3: Conectarse al router `mongos`

```bash
docker exec -it mongos mongosh --port 27020
```

> Si `mongos` no logra conectarse, puede haber arrancado antes de que el config server estuviera inicializado. Reiniciarlo con `docker compose restart mongos`.

### Paso 4: Agregar los shards al cluster

```js
sh.addShard("shard1ReplSet/shard1:27018")
sh.addShard("shard2ReplSet/shard2:27019")
```

Confirmar con:

```js
sh.status()
```

En la salida se verifican los dos shards registrados, el *autosplit* habilitado y el balanceador activo.

### Paso 5: Habilitar sharding en la base de datos y la colección

```js
sh.enableSharding("dbemp")
use dbemp
db.emp.createIndex({ empno: "hashed" })
sh.shardCollection("dbemp.emp", { empno: "hashed" })
```

### Paso 6: Insertar datos

```js
db.emp.insertMany([
  { empno: 7369, ename: "SMITH",  job: "CLERK",     mgr: 7902, hiredate: ISODate("1980-12-17T00:00:00.000Z"), sal: 800,  comm: null, dept: { deptno: 20, dname: "RESEARCH",   loc: "DALLAS"   } },
  { empno: 7499, ename: "ALLEN",  job: "SALESMAN",  mgr: 7698, hiredate: ISODate("1981-02-20T00:00:00.000Z"), sal: 1600, comm: 300,  dept: { deptno: 30, dname: "SALES",      loc: "CHICAGO"  } },
  { empno: 7521, ename: "WARD",   job: "SALESMAN",  mgr: 7698, hiredate: ISODate("1981-02-22T00:00:00.000Z"), sal: 1250, comm: 500,  dept: { deptno: 30, dname: "SALES",      loc: "CHICAGO"  } },
  { empno: 7566, ename: "JONES",  job: "MANAGER",   mgr: 7839, hiredate: ISODate("1981-04-02T00:00:00.000Z"), sal: 2975, comm: null, dept: { deptno: 20, dname: "RESEARCH",   loc: "DALLAS"   } },
  { empno: 7654, ename: "MARTIN", job: "SALESMAN",  mgr: 7698, hiredate: ISODate("1981-09-28T00:00:00.000Z"), sal: 1250, comm: 1400, dept: { deptno: 30, dname: "SALES",      loc: "CHICAGO"  } },
  { empno: 7698, ename: "BLAKE",  job: "MANAGER",   mgr: 7839, hiredate: ISODate("1981-05-01T00:00:00.000Z"), sal: 2850, comm: null, dept: { deptno: 30, dname: "SALES",      loc: "CHICAGO"  } },
  { empno: 7782, ename: "CLARK",  job: "MANAGER",   mgr: 7839, hiredate: ISODate("1981-06-09T00:00:00.000Z"), sal: 2450, comm: null, dept: { deptno: 10, dname: "ACCOUNTING", loc: "NEW YORK" } },
  { empno: 7788, ename: "SCOTT",  job: "ANALYST",   mgr: 7566, hiredate: ISODate("1987-04-19T00:00:00.000Z"), sal: 3000, comm: null, dept: { deptno: 20, dname: "RESEARCH",   loc: "DALLAS"   } },
  { empno: 7839, ename: "KING",   job: "PRESIDENT", mgr: null, hiredate: ISODate("1981-11-17T00:00:00.000Z"), sal: 5000, comm: null, dept: { deptno: 10, dname: "ACCOUNTING", loc: "NEW YORK" } },
  { empno: 7844, ename: "TURNER", job: "SALESMAN",  mgr: 7698, hiredate: ISODate("1981-09-08T00:00:00.000Z"), sal: 1500, comm: 0,    dept: { deptno: 30, dname: "SALES",      loc: "CHICAGO"  } },
  { empno: 7876, ename: "ADAMS",  job: "CLERK",     mgr: 7788, hiredate: ISODate("1987-05-23T00:00:00.000Z"), sal: 1100, comm: null, dept: { deptno: 20, dname: "RESEARCH",   loc: "DALLAS"   } },
  { empno: 7900, ename: "JAMES",  job: "CLERK",     mgr: 7698, hiredate: ISODate("1981-12-03T00:00:00.000Z"), sal: 950,  comm: null, dept: { deptno: 30, dname: "SALES",      loc: "CHICAGO"  } },
  { empno: 7902, ename: "FORD",   job: "ANALYST",   mgr: 7566, hiredate: ISODate("1981-12-03T00:00:00.000Z"), sal: 3000, comm: null, dept: { deptno: 20, dname: "RESEARCH",   loc: "DALLAS"   } },
  { empno: 7934, ename: "MILLER", job: "CLERK",     mgr: 7782, hiredate: ISODate("1982-01-23T00:00:00.000Z"), sal: 1300, comm: null, dept: { deptno: 10, dname: "ACCOUNTING", loc: "NEW YORK" } }
])
```

### Paso 7: Verificar la distribución entre shards

```js
db.emp.getShardDistribution()
```

El resultado muestra, por cada shard, la cantidad de documentos, el tamaño de los datos y el número de chunks, además del porcentaje que representa cada shard sobre el total de los 14 documentos.

---

##  Limpieza

```bash
docker compose down -v
```

La opción `-v` elimina también los volúmenes (se pierden los datos del cluster).

---

##  Notas

- **Router único de acceso:** el cliente solo habla con `mongos`; este consulta al config server qué chunks tiene cada shard y enruta cada operación.
- **Shard key hashed:** reparte los documentos de forma pareja entre los shards y permite consultas dirigidas por `empno`, a cambio de que las búsquedas por rango o por otros campos se ejecuten en todos los shards.
- **Chunks:** MongoDB divide los datos en chunks y el balanceador los redistribuye automáticamente cuando hay desbalance. Con pocos documentos (como en este ejemplo) los chunks no se dividen por tamaño, ya que el tamaño máximo por defecto es de 128 MB en MongoDB 7.0.
- **Limitaciones de la práctica:** cada replica set tiene un solo miembro (sin tolerancia a fallos real) y el acceso no tiene autenticación habilitada. En producción se usarían al menos 3 miembros por replica set y control de acceso.
