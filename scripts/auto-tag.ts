#!/usr/bin/env esno

import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import process from 'node:process'
import { execSync } from 'node:child_process'

const packageJsonPath = join(process.cwd(), 'package.json')
const gitCommand = 'git'

/**
 * 获取当前package.json中的版本
 */
function getCurrentVersion(): string {
  try {
    const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf-8'))
    return packageJson.version || ''
  }
  catch (error) {
    console.error('读取package.json失败:', error)
    process.exit(1)
  }
}

/**
 * 获取最新的版本tag
 */
function getLatestVersionTag(): string {
  try {
    const result = execSync(`${gitCommand} tag --list --sort=-version:refname 'v*' | head -n 1`, {
      encoding: 'utf-8',
      stdio: 'pipe',
    }).trim()
    return result || ''
  }
  catch {
    return ''
  }
}

/**
 * 检查文件是否在本次提交中发生了变更
 */
function isFileChangedInCommit(): boolean {
  try {
    // 获取已暂存的变更文件
    const stagedFiles = execSync(`${gitCommand} diff --cached --name-only`, {
      encoding: 'utf-8',
      stdio: 'pipe',
    }).trim().split('\n').filter(Boolean)

    // 检查package.json是否在暂存文件中
    if (stagedFiles.includes('package.json')) {
      return true
    }

    return false
  }
  catch {
    return false
  }
}

/**
 * 获取HEAD提交中的package.json版本
 */
function getPreviousVersion(): string {
  const result = execSync(`${gitCommand} show HEAD:package.json`, {
    encoding: 'utf-8',
    stdio: 'pipe',
  })
  const packageJson = JSON.parse(result)
  return packageJson.version || ''
}

/**
 * 创建新的git tag
 */
function createTag(version: string): void {
  const tagName = `v${version}`

  execSync(`${gitCommand} tag -a ${tagName} -m "Release ${tagName}"`, { stdio: 'inherit' })
}

/**
 * 主函数
 */
function main(): void {
  if (!isFileChangedInCommit()) {
    return
  }

  const currentVersion = getCurrentVersion()
  const previousVersion = getPreviousVersion()

  if (!currentVersion) {
    return
  }

  if (!previousVersion) {
    createTag(currentVersion)
    return
  }

  if (currentVersion === previousVersion) {
    return
  }

  // 检查tag是否已存在
  const existingTag = getLatestVersionTag()
  if (existingTag === `v${currentVersion}`) {
    return
  }

  createTag(currentVersion)
}

main()
