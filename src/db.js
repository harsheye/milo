import Dexie from "dexie";

export const db = new Dexie("vehiclelog-pro");

db.version(1).stores({
  fuel: "++id,date,vehicle,station",
  trips: "++id,date,vehicle,category",
  maintenance: "++id,date,vehicle,type",
  expenses: "++id,date,vehicle,category",
});

db.version(2).stores({
  fuel: "++id,date,vehicle,station",
  trips: "++id,date,vehicle,category",
  maintenance: "++id,date,vehicle,type",
  expenses: "++id,date,vehicle,category",
}).upgrade(async (tx) => {
  await Promise.all(["fuel", "trips", "maintenance", "expenses"].map((table) => tx.table(table).clear()));
});

db.version(3).stores({
  fuel: "++id,date,vehicle,station",
  trips: "++id,date,vehicle,category",
  maintenance: "++id,date,vehicle,type",
  expenses: "++id,date,vehicle,category",
}).upgrade(async (tx) => {
  await Promise.all(["fuel", "trips", "maintenance", "expenses"].map((table) => tx.table(table).clear()));
});

export async function saveEntry(type, entry) {
  const table = type === "service" ? "maintenance" : type;
  return db.table(table).add({ ...entry, createdAt: new Date().toISOString() });
}

export async function getFuelEntries() {
  return db.fuel.orderBy("date").toArray();
}
