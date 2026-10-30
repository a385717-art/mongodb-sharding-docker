#!/usr/bin/env bash
# levanta el cluster y corre todos los scripts de configuracion en orden
# se corre desde la raiz del repo:  ./scripts/setup.sh
# las salidas se guardan en evidencias/
set -e

cd "$(dirname "$0")/.."
mkdir -p evidencias

# por si alguien tiene docker-compose (v1) en lugar de "docker compose"
if docker compose version >/dev/null 2>&1; then
  COMPOSE="docker compose"
else
  COMPOSE="docker-compose"
fi

# espera a que un nodo responda al ping
esperar() {
  echo "esperando el puerto $1..."
  until mongosh --port "$1" --quiet --eval 'db.runCommand({ ping: 1 }).ok' >/dev/null 2>&1; do
    sleep 1
  done
}

# corre un script, lo muestra en pantalla y lo guarda en evidencias/
correr() { # puerto script archivo_salida
  echo ">>> mongosh --port $1 $2" | tee "evidencias/$3"
  mongosh --port "$1" --quiet "$2" 2>&1 | tee -a "evidencias/$3"
  echo
}

echo "== Paso 1: levantar contenedores =="
$COMPOSE up -d 2>&1 | tee evidencias/01_compose_up.txt
$COMPOSE ps >> evidencias/01_compose_up.txt

for p in 28017 28018 28019 28021; do esperar $p; done

echo "== Paso 2: inicializar replica sets =="
correr 28017 scripts/01_init_configsvr.js 02_init_configsvr.txt
correr 28018 scripts/02_init_shard1.js    02_init_shard1.txt
correr 28019 scripts/03_init_shard2.js    02_init_shard2.txt
correr 28021 scripts/04_init_shard3.js    02_init_shard3.txt

echo "== Paso 3: conexion a mongos =="
esperar 28020
# si msg sale como isdbgrid quiere decir que si estamos hablando con un mongos
echo '>>> mongosh --port 28020 --eval "db.hello()"' | tee evidencias/03_conexion_mongos.txt
mongosh --port 28020 --quiet --eval 'const h = db.hello(); printjson({ msg: h.msg, isWritablePrimary: h.isWritablePrimary, maxWireVersion: h.maxWireVersion }); print("version: " + db.version())' 2>&1 | tee -a evidencias/03_conexion_mongos.txt

echo "== Paso 4: agregar shards =="
correr 28020 scripts/05_add_shards.js 04_add_shards.txt

echo "== Paso 5: sharding de dbemp.emp =="
correr 28020 scripts/06_sharding_dbemp.js 05_sharding_dbemp.txt

echo "== Paso 6: insertar empleados =="
correr 28020 scripts/07_insert_emp.js 06_insert_emp.txt
correr 28020 scripts/09_verificacion.js 07_verificacion_14docs.txt
correr 28020 scripts/08_insert_extra.js 06_insert_extra.txt

echo "== Paso 7: verificacion =="
correr 28020 scripts/09_verificacion.js 07_verificacion.txt

echo "listo, el cluster quedo configurado"
