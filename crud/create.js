// CREATE: insertar empleados nuevos en la coleccion shardeada
// correr con: mongosh --port 28020 crud/create.js

db = db.getSiblingDB("dbemp");

// los nuevos van al departamento 40 (OPERATIONS), que en la tabla
// DEPT original existe pero no tenia empleados
const operations = { deptno: 40, dname: "OPERATIONS", loc: "BOSTON" };

print("---- insertOne ----");
const r1 = db.emp.insertOne({
  empno: 9001, ename: "HERRERA", job: "ANALYST", mgr: 7839,
  hiredate: ISODate("2026-10-29"), sal: 2800, comm: null, dept: operations
});
printjson(r1);

print("\n---- insertMany ----");
const r2 = db.emp.insertMany([
  { empno: 9002, ename: "IBARRA", job: "ANALYST", mgr: 9001, hiredate: ISODate("2026-10-29"), sal: 2700, comm: null, dept: operations },
  { empno: 9003, ename: "LOPEZ",  job: "CLERK",   mgr: 9001, hiredate: ISODate("2026-10-29"), sal: 1200, comm: null, dept: operations },
  { empno: 9004, ename: "GARCIA", job: "CLERK",   mgr: 9001, hiredate: ISODate("2026-10-29"), sal: 1150, comm: null, dept: operations }
]);
printjson(r2);

// comprobamos que si quedaron guardados
print("\n---- empleados de OPERATIONS despues de insertar ----");
db.emp.find(
  { "dept.dname": "OPERATIONS" },
  { _id: 0, empno: 1, ename: 1, job: 1, sal: 1 }
).sort({ empno: 1 }).forEach(d => printjson(d));
print("total en dbemp.emp: " + db.emp.countDocuments());
