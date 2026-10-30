// Paso 2: inicializar el replica set del shard 3
// correr con: mongosh --port 28021 scripts/04_init_shard3.js

// si ya estaba inicializado no lo volvemos a hacer
try {
  rs.status();
  print("shard3ReplSet ya estaba inicializado");
} catch (e) {
  const res = rs.initiate({
    _id: "shard3ReplSet",
    members: [{ _id: 0, host: "shard3:27021" }]
  });
  printjson(res);
}

// esperamos a que el nodo quede como PRIMARY
while (!db.hello().isWritablePrimary) {
  print("esperando a que shard3:27021 sea primario...");
  sleep(1000);
}
print("shard3ReplSet listo, el nodo ya es PRIMARY");
