// Paso 6: insertar los empleados (tabla EMP/DEPT clasica de Oracle)
// el departamento va embebido dentro de cada empleado
//   mongosh --port 28020 scripts/07_insert_emp.js

db = db.getSiblingDB("dbemp");

// departamentos para no repetirlos en cada documento
const accounting = { deptno: 10, dname: "ACCOUNTING", loc: "NEW YORK" };
const research   = { deptno: 20, dname: "RESEARCH",   loc: "DALLAS" };
const sales      = { deptno: 30, dname: "SALES",      loc: "CHICAGO" };

const res = db.emp.insertMany([
  { empno: 7369, ename: "SMITH",  job: "CLERK",     mgr: 7902, hiredate: ISODate("1980-12-17"), sal: 800,  comm: null, dept: research },
  { empno: 7499, ename: "ALLEN",  job: "SALESMAN",  mgr: 7698, hiredate: ISODate("1981-02-20"), sal: 1600, comm: 300,  dept: sales },
  { empno: 7521, ename: "WARD",   job: "SALESMAN",  mgr: 7698, hiredate: ISODate("1981-02-22"), sal: 1250, comm: 500,  dept: sales },
  { empno: 7566, ename: "JONES",  job: "MANAGER",   mgr: 7839, hiredate: ISODate("1981-04-02"), sal: 2975, comm: null, dept: research },
  { empno: 7654, ename: "MARTIN", job: "SALESMAN",  mgr: 7698, hiredate: ISODate("1981-09-28"), sal: 1250, comm: 1400, dept: sales },
  { empno: 7698, ename: "BLAKE",  job: "MANAGER",   mgr: 7839, hiredate: ISODate("1981-05-01"), sal: 2850, comm: null, dept: sales },
  { empno: 7782, ename: "CLARK",  job: "MANAGER",   mgr: 7839, hiredate: ISODate("1981-06-09"), sal: 2450, comm: null, dept: accounting },
  { empno: 7788, ename: "SCOTT",  job: "ANALYST",   mgr: 7566, hiredate: ISODate("1987-04-19"), sal: 3000, comm: null, dept: research },
  { empno: 7839, ename: "KING",   job: "PRESIDENT", mgr: null, hiredate: ISODate("1981-11-17"), sal: 5000, comm: null, dept: accounting },
  { empno: 7844, ename: "TURNER", job: "SALESMAN",  mgr: 7698, hiredate: ISODate("1981-09-08"), sal: 1500, comm: 0,    dept: sales },
  { empno: 7876, ename: "ADAMS",  job: "CLERK",     mgr: 7788, hiredate: ISODate("1987-05-23"), sal: 1100, comm: null, dept: research },
  { empno: 7900, ename: "JAMES",  job: "CLERK",     mgr: 7698, hiredate: ISODate("1981-12-03"), sal: 950,  comm: null, dept: sales },
  { empno: 7902, ename: "FORD",   job: "ANALYST",   mgr: 7566, hiredate: ISODate("1981-12-03"), sal: 3000, comm: null, dept: research },
  { empno: 7934, ename: "MILLER", job: "CLERK",     mgr: 7782, hiredate: ISODate("1982-01-23"), sal: 1300, comm: null, dept: accounting }
]);

print("acknowledged: " + res.acknowledged);
print("documentos insertados: " + Object.keys(res.insertedIds).length);
print("total en dbemp.emp: " + db.emp.countDocuments());
