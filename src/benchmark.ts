import { PerformanceObserver } from "node:perf_hooks";

const obs = new PerformanceObserver((items) => {
  const [item] = items.getEntries();
  console.log(`${item.name}: ${item.duration}ms`);
});

obs.observe({ entryTypes: ["measure"] });

require("./mongodb.benchmark");
require("./elasticsearch.benchmark");
