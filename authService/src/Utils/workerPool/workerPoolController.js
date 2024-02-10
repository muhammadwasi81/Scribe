import * as WorkerPool from "workerpool";

let poolProxy = null;

const init = async (options) => {
  const pool = WorkerPool.pool("./src/Utils/workerPool/workerFunctions.js", options);
  poolProxy = await pool.proxy();
  console.log(
    `Worker Threads Enabled - Min Workers: ${pool.minWorkers} - Max Workers: ${pool.maxWorkers} - Worker Type: ${pool.workerType}`,
  );
};
const get = () => {
  return poolProxy;
};
export default {
  init,
  get,
};
