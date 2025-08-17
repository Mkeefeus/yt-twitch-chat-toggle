#!/usr/bin/env bun
import { compile } from 'sass';
import { writeFileSync } from 'fs';

function compileFile(input: string, output: string) {
  // use modern API: compile returns css and optional sourceMap
  const result = compile(input, { sourceMap: true, style: 'expanded' });

  // result.css may be string or Uint8Array
  const cssOut = typeof result.css === 'string' ? result.css : Buffer.from(result.css);
  writeFileSync(output, cssOut);

  // some versions expose source map as `sourceMap` or `map` and it may be object or string
  const map: any = (result as any).sourceMap ?? (result as any).map;
  if (map) {
    const mapData = typeof map === 'string' ? map : JSON.stringify(map);
    writeFileSync(output + '.map', mapData);
  }

  console.log(`Compiled ${input} -> ${output}`);
}

compileFile('src/styles/styles.scss', 'src/styles.css');
compileFile('src/styles/popup.scss', 'src/popup.css');
compileFile('src/styles/prompt.scss', 'src/prompt.css');
