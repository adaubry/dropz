/**
 * Validation endpoint to check if Rust export tool is installed
 *
 * This endpoint helps diagnose issues with the Rust export integration
 * by checking if export-logseq-notes is properly installed and accessible.
 */

import { NextResponse } from 'next/server';
import { RustExportService } from '@/services/rust-export';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export async function GET() {
  try {
    console.log('[Rust Validation] Starting validation check...');

    // 1. Check if tool is installed
    const isInstalled = await RustExportService.validateInstallation();
    console.log('[Rust Validation] Installation check:', isInstalled);

    if (!isInstalled) {
      return NextResponse.json({
        installed: false,
        error: 'export-logseq-notes not found in PATH',
        installCommand: 'cargo install --git https://github.com/dimfeld/export-logseq-notes.git',
        systemInfo: await getSystemInfo(),
      }, { status: 200 });
    }

    // 2. Get additional diagnostic info
    let toolPath = '';
    let version = '';

    try {
      const { stdout: pathOut } = await execAsync('which export-logseq-notes');
      toolPath = pathOut.trim();
    } catch (error) {
      console.error('[Rust Validation] Could not get tool path:', error);
    }

    try {
      const { stdout: versionOut } = await execAsync('export-logseq-notes --version');
      version = versionOut.trim();
    } catch (error) {
      console.error('[Rust Validation] Could not get version:', error);
    }

    return NextResponse.json({
      installed: true,
      toolPath,
      version,
      systemInfo: await getSystemInfo(),
      status: 'ready',
    });

  } catch (error: any) {
    console.error('[Rust Validation] Validation error:', error);

    return NextResponse.json({
      installed: false,
      error: error.message,
      systemInfo: await getSystemInfo(),
    }, { status: 500 });
  }
}

/**
 * Get system information for debugging
 */
async function getSystemInfo() {
  const info: Record<string, string> = {
    platform: process.platform,
    arch: process.arch,
    nodeVersion: process.version,
  };

  // Check Rust installation
  try {
    const { stdout } = await execAsync('rustc --version');
    info.rustVersion = stdout.trim();
  } catch (error) {
    info.rustVersion = 'not installed';
  }

  // Check Cargo installation
  try {
    const { stdout } = await execAsync('cargo --version');
    info.cargoVersion = stdout.trim();
  } catch (error) {
    info.cargoVersion = 'not installed';
  }

  // Check PATH
  info.path = process.env.PATH || 'not set';

  return info;
}
