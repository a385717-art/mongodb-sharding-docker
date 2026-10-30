// DELETE: borrar empleados
// correr con: mongosh --port 28020 crud/delete.js
// (borra los que se agregaron en create.js)

db = db.getSiblingDB("dbemp");

print("total antes de borrar: " + db.emp.countDocuments());

// deleteOne por empno (shard key), se va a un solo shard
print("\n---- deleteOne: empno 9004 ----");
printjson(db.emp.deleteOne({ empno: 9004 }));
print("existe 9004? " + (db.emp.countDocuments({ empno: 9004 }) > 0));

// deleteMany con otra condicion, se manda a todos los shards
print('\n---- deleteMany: dept.dname = "OPERATIONS" ----');
print("en OPERATIONS antes: " + db.emp.countDocuments({ "dept.dname": "OPERATIONS" }));
printjson(db.emp.deleteMany({ "dept.dname": "OPERATIONS" }));
print("en OPERATIONS despues: " + db.emp.countDocuments({ "dept.dname": "OPERATIONS" }));

print("\ntotal despues de borrar: " + db.emp.countDocuments());
