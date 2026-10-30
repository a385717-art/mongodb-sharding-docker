// Paso 2: inicializar el replica set del shard 2
// correr con: mongosh --port 28019 scripts/03_init_shard2.js

// si ya estaba inicializado no lo volvemos a hacer
try {
  rs.status();
  print("shard2ReplSet ya estaba inicializado");
} catch (e) {
  const res = rs.initiate({
    _id: "shard2ReplSet",
    members: [{ _id: 0, host: "shard2:27019" }]
  });
  printjson(res);
}

// esperamos a que el nodo quede como PRIMARY
while (!db.hello().isWritablePrimary) {
  print("esperando a que shard2:27019 sea primario...");
  sleep(1000);
}
print("shard2ReplSet listo, el nodo ya es PRIMARY");
