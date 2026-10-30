// Paso 2: inicializar el replica set del shard 1
// correr con: mongosh --port 28018 scripts/02_init_shard1.js

// si ya estaba inicializado no lo volvemos a hacer
try {
  rs.status();
  print("shard1ReplSet ya estaba inicializado");
} catch (e) {
  const res = rs.initiate({
    _id: "shard1ReplSet",
    members: [{ _id: 0, host: "shard1:27018" }]
  });
  printjson(res);
}

// esperamos a que el nodo quede como PRIMARY
while (!db.hello().isWritablePrimary) {
  print("esperando a que shard1:27018 sea primario...");
  sleep(1000);
}
print("shard1ReplSet listo, el nodo ya es PRIMARY");
