// Paso 6 (extra): con 14 empleados casi no se nota el reparto,
// asi que generamos 300 empleados mas con empno del 8001 al 8300
//   mongosh --port 28020 scripts/08_insert_extra.js

db = db.getSiblingDB("dbemp");

const depts = [
  { deptno: 10, dname: "ACCOUNTING", loc: "NEW YORK" },
  { deptno: 20, dname: "RESEARCH",   loc: "DALLAS" },
  { deptno: 30, dname: "SALES",      loc: "CHICAGO" }
];
const jobs = ["CLERK", "SALESMAN", "ANALYST", "MANAGER"];

const docs = [];
for (let i = 1; i <= 300; i++) {
  const empno = 8000 + i;
  const job = jobs[i % jobs.length];
  docs.push({
    empno: empno,
    ename: "EMP" + empno,
    job: job,
    mgr: 7839,
    hiredate: new Date(1990, 0, 1 + i), // una fecha distinta por empleado
    sal: 800 + (i * 37) % 3200,         // salarios entre 800 y 3999
    comm: job === "SALESMAN" ? 100 + (i % 5) * 100 : null,
    dept: depts[i % depts.length]
  });
}

const res = db.emp.insertMany(docs);
print("documentos insertados: " + Object.keys(res.insertedIds).length);
print("total en dbemp.emp: " + db.emp.countDocuments());
