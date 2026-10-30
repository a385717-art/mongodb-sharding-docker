// READ: consultas sobre la coleccion shardeada
// correr con: mongosh --port 28020 crud/read.js

db = db.getSiblingDB("dbemp");

// 1. busqueda por empno (es el shard key, mongos sabe a que shard ir)
print("---- 1. find por empno (query dirigida) ----");
db.emp.find(
  { empno: 7788 },
  { _id: 0, empno: 1, ename: 1, job: 1, sal: 1, "dept.dname": 1 }
).forEach(d => printjson(d));

// 2. busqueda por otro campo, aqui mongos tiene que preguntar a todos los shards
print("\n---- 2. find por dept.dname = SALES, ordenado por sal desc ----");
db.emp.find(
  { "dept.dname": "SALES", empno: { $lt: 8000 } }, // solo los clasicos para que no salgan 100+
  { _id: 0, empno: 1, ename: 1, job: 1, sal: 1, comm: 1 }
).sort({ sal: -1 }).forEach(d => printjson(d));

// 3. busqueda por salario con rango, tambien va a todos los shards
print("\n---- 3. find sal >= 2500 (top 5 por salario) ----");
db.emp.find(
  { sal: { $gte: 2500 } },
  { _id: 0, empno: 1, ename: 1, sal: 1, "dept.dname": 1 }
).sort({ sal: -1, empno: 1 }).limit(5).forEach(d => printjson(d));

// 4. conteo por departamento
print("\n---- 4. empleados por departamento ----");
db.emp.aggregate([
  { $group: { _id: "$dept.dname", empleados: { $sum: 1 } } },
  { $sort: { _id: 1 } }
]).forEach(d => printjson(d));

// 5. explain para ver la diferencia entre query dirigida y scatter-gather
// solo sacamos lo importante del explain porque completo es enorme

// junta los stages del plan, ej: FETCH <- IXSCAN (el de la derecha es el que se ejecuta primero)
function stages(st) {
  let txt = st.stage;
  while (st.inputStage) {
    st = st.inputStage;
    txt += " <- " + st.stage;
  }
  return txt;
}

function resumenExplain(titulo, exp) {
  const plan = exp.queryPlanner.winningPlan;
  const shards = exp.executionStats.executionStages.shards;
  print("\n" + titulo);
  print("  stage del mongos: " + plan.stage);
  print("  shards consultados: " + shards.length);
  shards.forEach(s => {
    print("    - " + s.shardName +
          " | stages: " + stages(s.executionStages) +
          " | docs examinados: " + s.totalDocsExamined +
          " | devueltos: " + s.nReturned);
  });
  print("  total devueltos: " + exp.executionStats.nReturned);
}

print("\n---- 5. explain() ----");
resumenExplain(
  'db.emp.find({ empno: 7839 }).explain("executionStats")',
  db.emp.find({ empno: 7839 }).explain("executionStats")
);
resumenExplain(
  'db.emp.find({ "dept.dname": "SALES" }).explain("executionStats")',
  db.emp.find({ "dept.dname": "SALES" }).explain("executionStats")
);
