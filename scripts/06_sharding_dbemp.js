// Paso 5: habilitar sharding en dbemp y shardear la coleccion emp
//   mongosh --port 28020 scripts/06_sharding_dbemp.js

// habilitamos sharding en la base de datos
printjson(sh.enableSharding("dbemp"));

// nos cambiamos a dbemp (en un script no funciona "use dbemp")
db = db.getSiblingDB("dbemp");

// indice hashed sobre empno, es el que va a usar el shard key
print('\ndb.emp.createIndex({ empno: "hashed" })');
printjson(db.emp.createIndex({ empno: "hashed" }));

// shardeamos la coleccion con el shard key hashed
print('\nsh.shardCollection("dbemp.emp", { empno: "hashed" })');
printjson(sh.shardCollection("dbemp.emp", { empno: "hashed" }));
