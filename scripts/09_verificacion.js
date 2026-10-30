// Paso 7: verificar el cluster y como quedaron repartidos los datos
//   mongosh --port 28020 scripts/09_verificacion.js

print("========== sh.status() ==========");
// en modo script hay que imprimirlo, si no no sale nada
print(sh.status());

print("\n========== db.emp.getShardDistribution() ==========");
db = db.getSiblingDB("dbemp");
print(db.emp.getShardDistribution());
