import { spawn } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import process from 'node:process';

const executable = process.platform === 'win32' ? 'gradlew.bat' : './gradlew';
const javaHome = process.env.JAVA_HOME;
if (!javaHome) {
  console.error('JAVA_HOME must point to JDK 17 or newer before running pnpm android:check.');
  process.exit(1);
}

const childEnvironment = { ...process.env };
if (!childEnvironment.ANDROID_HOME) {
  childEnvironment.ANDROID_HOME = childEnvironment.ANDROID_SDK_ROOT;
}
if (!childEnvironment.ANDROID_HOME) {
  const localProperties = resolve('android/local.properties');
  if (existsSync(localProperties)) {
    const sdkLine = readFileSync(localProperties, 'utf8')
      .split(/\r?\n/u)
      .find((line) => line.startsWith('sdk.dir='));
    const sdkDirectory = sdkLine
      ?.slice('sdk.dir='.length)
      .replaceAll('\\:', ':')
      .replaceAll('\\\\', '\\');
    if (sdkDirectory) childEnvironment.ANDROID_HOME = sdkDirectory;
  }
}
if (!childEnvironment.ANDROID_HOME) {
  console.error('ANDROID_HOME or android/local.properties must identify an installed Android SDK.');
  process.exit(1);
}

function runGradle(arguments_: string[]): Promise<number> {
  const command = process.platform === 'win32' ? (process.env.ComSpec ?? 'cmd.exe') : executable;
  const commandArguments =
    process.platform === 'win32' ? ['/d', '/s', '/c', executable, ...arguments_] : arguments_;

  return new Promise((resolveRun, rejectRun) => {
    const child = spawn(command, commandArguments, {
      cwd: resolve('android'),
      env: childEnvironment,
      stdio: 'inherit',
      shell: false
    });
    child.once('error', rejectRun);
    child.once('exit', (code, signal) => {
      if (signal) {
        rejectRun(new Error(`Android verification stopped by ${signal}.`));
      } else {
        resolveRun(code ?? 1);
      }
    });
  });
}

const verificationCode = await runGradle([
  'clean',
  'testDebugUnitTest',
  'assembleDebug',
  'lintDebug',
  'publishToMavenLocal',
  '--stacktrace',
  '--console=plain'
]);
if (verificationCode !== 0) {
  process.exitCode = verificationCode;
} else {
  process.exitCode = await runGradle([
    '-p',
    'consumer-smoke',
    'clean',
    'assembleDebug',
    '--stacktrace',
    '--console=plain'
  ]);
}
