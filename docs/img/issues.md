* Anyone can open an issue and attach a bounty.
* The current state is `open`:
    * the state can go `resolved`
        * there is a bounty
        * if it has no been resolved before
        * and the owner of the repository is providing a solution
    * the state can go to `closed`
        * there is no bounty -> the opener or the owner of the repository can close the issue or
        * if the issue has been resolved in the past and the sender of the tx is the opener or the owner of the repository
* from `resolved` the state can go to either `open` or `closed`
    * to `open` if the opener of the issue is not satisfied with the solution
    * to `closed` (which pays out the resolver)
        * if the opener is satisfied with the solution or
        * the resolver waits 604800 blocks and closes it
    