// Paso 2: inicializar el replica set del config server
// correr con: mongosh --port 28017 scripts/01_init_configsvr.js

// si ya estaba inicializado no lo volvemos a hacer
try {
  rs.status();
  print("configReplSet ya estaba inicializado");
} catch (e) {
  const res = rs.initiate({
    _id: "configReplSet",
    configsvr: true,
    members: [{ _id: 0, host: "configsvr:27017" }]
  });
  printjson(res);
}

// esperamos a que el nodo quede como PRIMARY
while (!db.hello().isWritablePrimary) {
  print("esperando a que configsvr:27017 sea primario...");
  sleep(1000);
}
print("configReplSet listo, el nodo ya es PRIMARY");
