// Paso 4: agregar los 3 shards al cluster
// esto se corre conectado al mongos:
//   mongosh --port 28020 scripts/05_add_shards.js

printjson(sh.addShard("shard1ReplSet/shard1:27018"));
printjson(sh.addShard("shard2ReplSet/shard2:27019"));
printjson(sh.addShard("shard3ReplSet/shard3:27021"));

// revisamos que salgan los 3 en la lista
print("\nShards registrados en el cluster:");
const lista = db.adminCommand({ listShards: 1 });
lista.shards.forEach(s => print(" - " + s._id + "  ->  " + s.host + "  (state: " + s.state + ")"));
print("Total de shards: " + lista.shards.length);
