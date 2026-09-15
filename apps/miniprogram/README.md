# Mini Program shell

Import the repository root in WeChat Developer Tools. The root
`project.config.json` points `miniprogramRoot` at this directory and enables the
Developer Tools TypeScript compiler. There is no separate repository build step
and no generated Mini Program output is committed; the root `typecheck` command
remains validation-only with `noEmit`.

The committed `touristappid` is the Developer Tools tourist placeholder, not a
real Mini Program AppID or credential. For development that requires a registered
or test AppID, select it locally in Developer Tools and keep the generated
`project.private.config.json` uncommitted. That file is ignored at the repository
root.
