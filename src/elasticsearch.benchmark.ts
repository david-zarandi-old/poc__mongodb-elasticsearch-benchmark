import { performance } from "node:perf_hooks";
import { Client } from "@elastic/elasticsearch";
import type { BaseParagraph } from "./types";

async function runElasticsearchBenchmark() {
  const uri = process.env.ELASTICSEARCH_CONNECTION_URI!;
  const username = process.env.ELASTICSEARCH_USERNAME!;
  const password = process.env.ELASTICSEARCH_PASSWORD!;
  const client = new Client({
    node: uri,
    auth: {
      username,
      password,
    },
  });

  const INDEX = "document";
  const DOCUMENT_ID = "655cf44b804766e86eae8c56"; // Example document ID from MongoDB
  const sampleParagraphs: Array<BaseParagraph> = require("../seed/sample-paragraphs.json");

  for (const sampleParagraph of sampleParagraphs) {
    await client.index({
      index: INDEX,
      document: {
        id: DOCUMENT_ID,
        paragraph: sampleParagraph.text,
      },
    });
  }

  await client.indices.refresh({ index: INDEX });

  async function searchText(searchTerm: string) {
    const results = await client.search({
      index: INDEX,
      query: {
        bool: {
          must: {
            match: {
              paragraph: searchTerm,
            },
          },
          filter: {
            match: { id: DOCUMENT_ID }
          },
        },
      },
    });
    console.dir(results.hits.hits, { depth: null });
  }

  performance.mark("Search Time (age) [elasticsearch]");
  await searchText("age");
  performance.measure("Search Time (age) [elasticsearch]", "Search Time (age) [elasticsearch]");

  performance.mark("Search Time (realm) [elasticsearch]");
  await searchText("realm");
  performance.measure("Search Time (realm) [elasticsearch]", "Search Time (realm) [elasticsearch]");

  const additionalParagraphs = require("../seed/additional-paragraphs.json");

  performance.mark("Update Time");
  for (const additionalParagraph of additionalParagraphs) {
    await client.index({
      index: INDEX,
      document: {
        id: DOCUMENT_ID,
        paragraph: additionalParagraph.text,
      },
    });
  }
  performance.measure("Update Time [elasticsearch]", "Update Time");

  await client.indices.refresh({ index: INDEX });

  performance.mark("Search Time (conclusion) [elasticsearch]");
  await searchText("conclusion");
  performance.measure("Search Time (conclusion) [elasticsearch]", "Search Time (conclusion) [elasticsearch]");

  await client.indices.delete({ index: INDEX });
  await client.close();
}

runElasticsearchBenchmark().catch(console.dir);
