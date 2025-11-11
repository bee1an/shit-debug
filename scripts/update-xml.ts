#!/usr/bin/env node

import { readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import process from 'node:process'

// 读取package.json获取版本号
const packageJsonPath = resolve(process.cwd(), 'package.json')
const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf-8'))
const version = packageJson.version

// XML模板
const xmlTemplate = `<?xml version='1.0' encoding='UTF-8'?>
<gupdate xmlns='http://www.google.com/update2/response' protocol='2.0'>
  <app appid='YOUR_EXTENSION_ID'>
    <updatecheck codebase='https://github.com/bee1an/shit-debug/releases/download/v${version}/extension.zip' version='${version}' />
  </app>
</gupdate>`

// 写入updates.xml文件
const updatesXmlPath = resolve(process.cwd(), 'updates.xml')
writeFileSync(updatesXmlPath, xmlTemplate, 'utf-8')
