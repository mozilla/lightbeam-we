# Contributing

Everyone is welcome to contribute to Lightbeam. Reach out to team members if you have questions:

- Email: lightbeam-feedback@mozilla.org

## Filing bugs

If you find a bug with Lightbeam, please file an issue.

Check first if the bug might already exist: [Existing issues](https://github.com/mozilla/lightbeam-we/issues)

[Open an issue](https://github.com/mozilla/lightbeam-we/issues/new)

1. Visit `about:support`
2. Click "Copy raw data to clipboard" and paste into the bug. Alternatively, copy the following sections into the issue:
    - Application Basics
    - Nightly Features (if you are in Nightly)
    - Extensions
    - Experimental Features
3. Include clear steps to reproduce the issue you have experienced.
4. Include screenshots if possible.

## Sending Pull Requests

Patches should be submitted as pull requests. When submitting patches as PRs:

- You agree to license your code under the project's open source license (MPL 2.0).
- Base your branch off the current master (see below for an example workflow).
- Add both your code and new tests if relevant.
- Run `npm test` to make sure all tests still pass.
- Please do not include merge commits in pull requests; include only commits with the new relevant code.

See the main [README](./README.md) for information on prerequisites, installing, running and testing.
