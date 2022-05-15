require("dotenv").config({ path: ".local.env" });
const fetch = require("node-fetch");
const fs = require("fs/promises");
const figma = require("./figma");

const accessToken = process.env.FIGMA_PERSONAL_ACCESS_TOKEN;
const fileKey = process.env.FIGMA_FILE_KEY;

const figmaDirectory = "./.figma";
const figmaComponentsFileName = "figmaComponents";

const headers = new fetch.Headers();

headers.append("X-Figma-Token", accessToken);

const baseUrl = "https://api.figma.com";

const vectorMap = {};
const vectorList = [];
const vectorTypes = ["VECTOR", "LINE", "REGULAR_POLYGON", "ELLIPSE", "STAR"];

function preprocessTree(node) {
  let vectorsOnly = !node.name.startsWith("[component]");
  let vectorVConstraint = null;
  let vectorHConstraint = null;

  function paintsRequireRender(paints) {
    if (!paints) return false;

    let numPaints = 0;
    for (const paint of paints) {
      if (paint.visible === false) continue;

      numPaints++;
      if (paint.type === "EMOJI") return true;
    }

    return numPaints > 1;
  }

  if (
    paintsRequireRender(node.fills) ||
    paintsRequireRender(node.strokes) ||
    (node.blendMode != null &&
      ["PASS_THROUGH", "NORMAL"].indexOf(node.blendMode) < 0)
  ) {
    node.type = "VECTOR";
  }

  const children =
    node.children && node.children.filter((child) => child.visible !== false);
  if (children) {
    for (let j = 0; j < children.length; j++) {
      if (vectorTypes.indexOf(children[j].type) < 0) vectorsOnly = false;
      else {
        if (
          vectorVConstraint != null &&
          children[j].constraints.vertical != vectorVConstraint
        )
          vectorsOnly = false;
        if (
          vectorHConstraint != null &&
          children[j].constraints.horizontal != vectorHConstraint
        )
          vectorsOnly = false;
        vectorVConstraint = children[j].constraints.vertical;
        vectorHConstraint = children[j].constraints.horizontal;
      }
    }
  }
  node.children = children;

  if (children && children.length > 0 && vectorsOnly) {
    node.type = "VECTOR";
    node.constraints = {
      vertical: vectorVConstraint,
      horizontal: vectorHConstraint,
    };
  }

  if (vectorTypes.indexOf(node.type) >= 0) {
    node.type = "VECTOR";
    vectorMap[node.id] = node;
    vectorList.push(node.id);
    node.children = [];
  }

  if (node.children) {
    for (const child of node.children) {
      preprocessTree(child);
    }
  }
}

async function main() {
  let resp = await fetch(`${baseUrl}/v1/files/${fileKey}`, { headers });
  let data = await resp.json();

  console.log("data", data);

  const doc = data.document;
  const canvas = doc.children[0];
  console.log("canvas", canvas);
  let html = "";

  for (let i = 0; i < canvas.children.length; i++) {
    const child = canvas.children[i];
    if (child.name.startsWith("[component]") && child.visible !== false) {
      const child = canvas.children[i];
      preprocessTree(child);
    }
  }

  let guids = vectorList.join(",");
  console.log("fileKey", fileKey);
  console.log("guids", guids);
  let svgMap = {};
  if (guids.length) {
    data = await fetch(
      `${baseUrl}/v1/images/${fileKey}?ids=${guids}&format=svg`,
      { headers }
    );

    svgMap = await data.json();
  }
  console.log("svgMap", svgMap);
  const imageFillsResponse = await fetch(
    `${baseUrl}/v1/files/${fileKey}/images`,
    { headers }
  );
  const {
    meta: { images: imageFillsMap },
  } = await imageFillsResponse.json();

  console.log("imageFillsMap", imageFillsMap);
  const images = { ...svgMap, ...imageFillsMap };

  const componentMap = {};
  let contents = `import React from 'react';\n\n`;
  console.log("images", images);
  for (let i = 0; i < canvas.children.length; i++) {
    const child = canvas.children[i];
    if (child.name.startsWith("[component]") && child.visible !== false) {
      const child = canvas.children[i];
      figma.createComponent(child, images, componentMap);
    }
  }

  for (const key in componentMap) {
    contents += componentMap[key].doc + "\n";
  }

  await fs.rm(figmaDirectory, { recursive: true, force: true });
  await fs.mkdir(figmaDirectory, { recursive: true });

  const figmaComponentsFilePath = `${figmaDirectory}/${figmaComponentsFileName}.js`;
  await fs.writeFile(figmaComponentsFilePath, contents);
  await fs.writeFile(
    `${figmaDirectory}/index.js`,
    `import * as figmaComponents from "./figmaComponents";

export const withFigmaComponents = (componentsMap) => ({
  ...componentsMap,
  ...Object.entries(figmaComponents).reduce(
    (map, [key, value]) => ({ ...map, [key.toLowerCase()]: value }),
    {}
  ),
});`
  );
}

main().catch((err) => {
  console.error(err);
  console.error(err.stack);
});
