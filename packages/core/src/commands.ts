/** Canonical curated recognition data; native copies are generated from this map. */
export const COMMAND_SUBCOMMANDS = {
    npm: 'install i ci run test start build exec publish init update uninstall audit pack login',
    pnpm: 'install i add remove run test start build exec dlx publish init update audit',
    yarn: 'install add remove run test start build exec dlx publish init upgrade',
    npx: '', git: 'status diff add commit push pull fetch clone checkout switch branch log show merge rebase tag init remote reset restore',
    pip: 'install uninstall list freeze show check download wheel', python: '', node: '',
    cargo: 'build check run test clippy fmt install update publish new init clean doc',
    go: 'build run test mod get install fmt vet version env clean generate tool',
    docker: 'run build compose pull push images image ps exec stop start rm rmi logs inspect',
    kubectl: 'get describe apply delete create edit logs exec config rollout scale version'
};
const SUBCOMMANDS: Readonly<Record<string, ReadonlySet<string>>> = Object.fromEntries(
  Object.entries(COMMAND_SUBCOMMANDS).map(([executable, words]) => [executable, new Set(words.split(' ').filter(Boolean))])
);

/** A bare executable plus arbitrary English words is not command evidence. */
export function isCommandArgument(executable: string, argument: string): boolean {
  if (!(executable in SUBCOMMANDS)) return false;
  return SUBCOMMANDS[executable]!.has(argument)
    || /^--?[A-Za-z0-9_-]+$/u.test(argument)
    || /[./\\@:=]/u.test(argument)
    || /^(['"]).*\1$/u.test(argument);
}
