# Cluster MongoDB con Sharding en Docker

Práctica de Base de Datos Avanzadas (UACH - FING, LICO).
Equipo: Ezequiel Herrera y Diego Ibarra.

Montamos un cluster de MongoDB con sharding usando Docker: un config server, tres shards y un router `mongos`. Sobre ese cluster creamos la base `dbemp` con la colección `emp` (empleados), la shardeamos con el shard key `{ empno: "hashed" }` y le hicimos operaciones CRUD.

Versiones: MongoDB 7.0.45 (imagen `mongo:7.0.45`) y mongosh 2.x.

## Arquitectura

| Servicio      | Contenedor  | Puerto host | Puerto interno | Replica set     |
|---------------|-------------|-------------|----------------|-----------------|
| Config server | `configsvr` | 28017       | 27017          | `configReplSet` |
| Shard 1       | `shard1`    | 28018       | 27018          | `shard1ReplSet` |
| Shard 2       | `shard2`    | 28019       | 27019          | `shard2ReplSet` |
| Shard 3       | `shard3`    | 28021       | 27021          | `shard3ReplSet` |
| Router        | `mongos`    | 28020       | 27020          | —               |

```
                         ┌──────────┐
      Cliente ─────────► │  mongos  │ :28020
                         └────┬─────┘
       ┌──────────────┬───────┴──────┬──────────────┐
       ▼              ▼              ▼              ▼
 ┌───────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐
 │ configsvr │  │  shard1  │  │  shard2  │  │  shard3  │
 │  :28017   │  │  :28018  │  │  :28019  │  │  :28021  │
 └───────────┘  └──────────┘  └──────────┘  └──────────┘
```

Cada nodo es un replica set de un solo miembro (para la práctica es suficiente). Todo va en la red `mongo-cluster` y cada nodo tiene su propio volumen.

## Estructura del repo

```
.
├── README.md
├── docker-compose.yml        # los 5 servicios del cluster
├── scripts/                  # operaciones de configuracion (en orden)
│   ├── setup.sh              # corre todo lo de abajo y guarda las salidas
│   ├── 01_init_configsvr.js  # rs.initiate del config server
│   ├── 02_init_shard1.js     # rs.initiate de shard1
│   ├── 03_init_shard2.js     # rs.initiate de shard2
│   ├── 04_init_shard3.js     # rs.initiate de shard3
│   ├── 05_add_shards.js      # sh.addShard de los 3 shards
│   ├── 06_sharding_dbemp.js  # enableSharding, indice hashed y shardCollection
│   ├── 07_insert_emp.js      # los 14 empleados de EMP/DEPT
│   ├── 08_insert_extra.js    # 300 empleados generados (empno 8001-8300)
│   └── 09_verificacion.js    # sh.status() y getShardDistribution()
├── crud/                     # operaciones CRUD contra mongos
│   ├── create.js
│   ├── read.js
│   ├── update.js
│   └── delete.js
└── evidencias/               # salidas reales de cada paso
```

## Modelo de datos

Base `dbemp`, colección `emp`. Usamos la tabla EMP/DEPT clásica de Oracle, con el departamento embebido en cada empleado:

```js
{
  empno: 7369, ename: "SMITH", job: "CLERK", mgr: 7902,
  hiredate: ISODate("1980-12-17"), sal: 800, comm: null,
  dept: { deptno: 20, dname: "RESEARCH", loc: "DALLAS" }
}
```

### Shard key: `{ empno: "hashed" }`

- `empno` es distinto para cada empleado, así que tiene mucha cardinalidad.
- Al usar hash, los empleados se reparten parejo entre los 3 shards aunque los `empno` sean seguidos.
- Si buscas por `empno`, mongos va directo a un solo shard (query dirigida). Si buscas por otro campo (`dept.dname`, `sal`, etc.) o por rango de `empno`, tiene que preguntarle a los 3 shards (scatter-gather).

## Cómo levantar el cluster

Necesitas Docker con Docker Compose y `mongosh` instalado en tu máquina. Todos los comandos se corren desde la raíz del repo.

### Opción rápida

```bash
./scripts/setup.sh
```

Levanta los contenedores, corre los scripts del 01 al 09 en orden y guarda lo que imprime cada uno en `evidencias/`.

### Paso a paso

**Paso 1. Levantar los contenedores**

```bash
docker compose up -d
docker compose ps
```

**Paso 2. Inicializar los replica sets** (cada uno se conecta directo a su nodo)

```bash
mongosh --port 28017 scripts/01_init_configsvr.js
mongosh --port 28018 scripts/02_init_shard1.js
mongosh --port 28019 scripts/03_init_shard2.js
mongosh --port 28021 scripts/04_init_shard3.js
```

**Paso 3. Conectarse al mongos**

```bash
mongosh --port 28020
```

Si al hacer `db.hello()` sale `msg: 'isdbgrid'`, entonces sí estás conectado al router. Si mongos no conecta porque arrancó antes de que el config server estuviera listo, reinícialo con `docker compose restart mongos`.

**Paso 4. Agregar los 3 shards**

```bash
mongosh --port 28020 scripts/05_add_shards.js
```

**Paso 5. Habilitar sharding y definir el shard key**

```bash
mongosh --port 28020 scripts/06_sharding_dbemp.js
```

Esto hace `sh.enableSharding("dbemp")`, `db.emp.createIndex({ empno: "hashed" })` y `sh.shardCollection("dbemp.emp", { empno: "hashed" })`.

**Paso 6. Insertar los empleados**

```bash
mongosh --port 28020 scripts/07_insert_emp.js
mongosh --port 28020 scripts/08_insert_extra.js   # opcional, para que se vea mejor el reparto
```

**Paso 7. Verificar**

```bash
mongosh --port 28020 scripts/09_verificacion.js
```

Lo que nos salió:

| Shard   | Con 14 docs | Con 314 docs |
|---------|-------------|--------------|
| shard1  | 5           | 116          |
| shard2  | 5           | 103          |
| shard3  | 4           | 95           |

Cada shard quedó con 2 chunks (6 en total). Al shardear una colección vacía con clave hashed, MongoDB crea esos chunks de una vez y los reparte entre los shards.

> Si no tienes mongosh en tu máquina, puedes usar el de los contenedores, porque `scripts/` y `crud/` están montados. Por ejemplo:
> `docker exec configsvr mongosh --port 27017 /scripts/01_init_configsvr.js`
> `docker exec mongos mongosh --port 27020 /crud/read.js`

## Operaciones CRUD

Se corren contra el mongos y en este orden:

```bash
mongosh --port 28020 crud/create.js   # insertOne + insertMany (empleados 9001-9004 en OPERATIONS)
mongosh --port 28020 crud/read.js     # find por empno, por dept.dname y por sal, y explain()
mongosh --port 28020 crud/update.js   # updateOne a empno 7369 y updateMany a ACCOUNTING
mongosh --port 28020 crud/delete.js   # deleteOne de 9004 y deleteMany de OPERATIONS
```

Para guardar las salidas como evidencia:

```bash
for op in create read update delete; do
  mongosh --port 28020 --quiet crud/$op.js | tee evidencias/$op.txt
done
```

`delete.js` borra los empleados que agrega `create.js`, así que el CRUD se puede volver a correr. Lo único que no se regresa es lo de `update.js`, porque cada vez que lo corres vuelve a subir los sueldos.

## Apagar y limpiar

```bash
docker compose down      # apaga, los datos se quedan en los volumenes
docker compose down -v   # apaga y borra los volumenes (se pierde todo)
```

## Notas

- En el compose original el volumen del config server estaba en `/data/db`, pero con `--configsvr` mongo guarda los datos en `/data/configdb`, así que lo cambiamos para que los metadatos sí se queden en el volumen.
- En MongoDB 7.0, `updateOne` y `deleteOne` sobre una colección shardeada necesitan llevar el shard key (o el `_id`) en el filtro. Por eso los nuestros filtran por `empno`.
- No hay autenticación y cada replica set tiene un solo miembro, así que no hay tolerancia a fallos. En producción se usarían 3 miembros por replica set y usuarios con contraseña.
