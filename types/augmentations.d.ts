// eslint-disable @typescript-eslint/no-explicit-any
import { Fixture } from "ethereum-waffle";

import { Signers } from "./";
import { RitzIco } from "../typechain/RitzIco";

declare module "mocha" {
  export interface Context {
    ritzIco: RitzIco;
    loadFixture: <T>(fixture: Fixture<T>) => Promise<T>;
    signers: Signers;
  }
}
