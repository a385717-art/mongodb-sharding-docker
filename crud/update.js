// UPDATE: modificar empleados
// correr con: mongosh --port 28020 crud/update.js

db = db.getSiblingDB("dbemp");

// para imprimir solo lo que nos interesa
const campos = { _id: 0, empno: 1, ename: 1, sal: 1, "dept.dname": 1 };

// updateOne: le subimos 200 de sueldo a SMITH (empno 7369)
// el filtro lleva el shard key, asi el update va directo a un shard
print("---- updateOne: subir sal de empno 7369 ----");
print("antes:");
printjson(db.emp.findOne({ empno: 7369 }, campos));
printjson(db.emp.updateOne({ empno: 7369 }, { $inc: { sal: 200 } }));
print("despues:");
printjson(db.emp.findOne({ empno: 7369 }, campos));

// updateMany: aumento de 250 a todo ACCOUNTING
// (primero usamos $mul con 1.10 pero salian decimales raros como 1430.0000000000002)
// aqui no va el shard key, entonces se manda a los 3 shards
print("\n---- updateMany: +250 de sal a ACCOUNTING ----");
const filtro = { "dept.dname": "ACCOUNTING", empno: { $lt: 8000 } };
print("antes:");
db.emp.find(filtro, campos).sort({ empno: 1 }).forEach(d => printjson(d));
printjson(db.emp.updateMany(filtro, { $inc: { sal: 250 } }));
print("despues:");
db.emp.find(filtro, campos).sort({ empno: 1 }).forEach(d => printjson(d));
