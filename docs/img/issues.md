* Anyone can open an issue and attach a bounty.
* If there is no bounty, the opener of the issue or the owner of the repository can close the issue.
* If there is a bounty and the current state is `open`:
    * the state can go `resolved`
        * if it has no been resolved before
        * and the owner of the repository is providing a solution
    * from `resolved` the state can go to either `open` or `closed`
        * to `open` if the opener of the issue is not satisfied with the solution
        * to `closed`
            * if the opener is satisfied with the solution or
            * the resolver waits 604800 blocks
* If there is no bounty and it has been resolved before, the opener or the owner of the repository can move it to `closed`
    