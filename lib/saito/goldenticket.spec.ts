import {Saito} from "../../apps/core";

const saito = require("./saito");
const blake3 = require("blake3");

test("golden ticket serialization", () => {
    // @ts-ignore
    let mockApp: Saito = {};
    let networkApi = new saito.networkApi(mockApp);
    let crypto = new saito.crypto(mockApp);
    let binary = new saito.binary(mockApp);
    let wallet = new saito.wallet(mockApp);
    mockApp.networkApi = networkApi;
    mockApp.crypto = crypto;
    mockApp.binary = binary;
    mockApp.wallet = wallet;
    wallet.wallet.privatekey = "4a16ffa08e5fc440772ee962c1d730041f12c7008a6e5c704d13dfd3d1905e0d";
    wallet.wallet.publickey = "28Mh8nEhxymH9bFMhSKU51pnSQAnqURuPYkXTUqY2ueDM";

    mockApp.hash = (data) => {
        return blake3.hash(data).toString('hex');
    };

    let target_hash = "844702489d49c7fb2334005b903580c7a48fe81121ff16ee6d1a528ad32f235e";
    let random_hash = "03bf1a4714cfc7ae33d3f6e860c23191ddea07bcb1bfa6c85bc124151ad8d4ce";
    let golden_ticket = new saito.goldenticket(mockApp);
    let buffer = golden_ticket.serialize(target_hash,
        random_hash
    );
    let result = golden_ticket.deserialize(buffer);
    expect(result.target_hash).toEqual(target_hash);
    expect(result.random_hash).toEqual(random_hash);
    expect(result.creator).toEqual(wallet.wallet.publickey);
});
