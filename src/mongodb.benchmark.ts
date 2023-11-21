import { performance } from "node:perf_hooks";
import { MongoClient } from "mongodb";
import type { BaseDocument, BaseParagraph } from "./types";

async function runMongodbBenchmark() {
  const uri = process.env.MONGODB_CONNECTION_URI!;
  const client = new MongoClient(uri);

  await client.connect();

  const database = client.db("benchmark");
  const documentCollection = database.collection("documents");
  const paragraphCollection = database.collection("paragraphs");

  const sampleDocuments = require("../seed/sample-documents.json").map(({ documentName }: BaseDocument) => ({
    documentName,
    paragraphs: [],
  }));
  await documentCollection.insertMany(sampleDocuments);
  const allDocuments = await documentCollection.find({}).toArray();

  const sampleParagraphs = require("../seed/sample-paragraphs.json");
  const documentParagraphs = sampleParagraphs.map(({ text }: BaseParagraph) => ({
    text,
    documentId: allDocuments[0]._id,
  }));

  console.log(allDocuments[0]._id);

  await paragraphCollection.createIndex({ text: "text" });
  await documentCollection.updateOne(
    { _id: allDocuments[0]._id },
    {
      $push: {
        paragraphs: Object.values((await paragraphCollection.insertMany(documentParagraphs)).insertedIds),
      },
    },
  );

  async function searchText(searchTerm: string) {
    const results = await paragraphCollection
      .find(
        { $text: { $search: searchTerm }, documentId: allDocuments[0]._id },
        { projection: { _id: 0, documentId: 0 } },
      )
      .toArray();
    console.log(`Search results for ${searchTerm}:`);
    console.dir(results, { depth: null });
  }

  performance.mark("Search Time (age) [mongodb]");
  await searchText("age");
  performance.measure("Search Time (age) [mongodb]", "Search Time (age) [mongodb]");

  performance.mark("Search Time (realm) [mongodb]");
  await searchText("realm");
  performance.measure("Search Time (realm) [mongodb]", "Search Time (realm) [mongodb]");

  const additionalParagraphs = require("../seed/additional-paragraphs.json");
  const additionalDocumentParagraphs = additionalParagraphs.map(({ text }: BaseParagraph) => ({
    text,
    documentId: allDocuments[0]._id,
  }));

  performance.mark("Update Time [mongodb]");
  await documentCollection.updateOne(
    { _id: allDocuments[0]._id },
    {
      $push: {
        paragraphs: Object.values((await paragraphCollection.insertMany(additionalDocumentParagraphs)).insertedIds),
      },
    },
  );
  performance.measure("Update Time [mongodb]", "Update Time [mongodb]");

  performance.mark("Search Time (conclusion) [mongodb]");
  await searchText("conclusion");
  performance.measure("Search Time (conclusion) [mongodb]", "Search Time (conclusion) [mongodb]");

  await documentCollection.drop();
  await paragraphCollection.drop();
  await client.close();
}

runMongodbBenchmark().catch(console.dir);
