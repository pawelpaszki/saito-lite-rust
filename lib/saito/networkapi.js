const saito = require('./saito');
const fetch = require('node-fetch');
const { set } = require('numeral');
const Base58 = require("base-58");
const secp256k1 = require('secp256k1');
const blake3 = require('blake3');

/**
 * An APIMessage
 * @typedef {Object} APIMessage
 * @property {array} command - The name of the command(remote procedure)
 * @property {number} index - The index of the API call, similar to JSON RPC's id.
 * @property {array} raw_message - the data being send to the remote procedure
 */

/**
 * A handshake Challenge
 * @typedef {Object} HandshakeChallenge
 * @property {array} their_ip_octets - four numbers representing an IP(v4)
 * @property {array} my_ip_octets - four numbers representing an IP(v4)
 * @property {string} their_address - a pubkey(hex)
 * @property {string} my_address - a pubkey(hex)
 * @property {u64} timestamp - unix timestamp of the challenge
 * @property {array} their_sig - bytes
 */

/**
 * This class provides functions for interacting with other nodes. It wraps
 * the low level socket/http functionality with higher-level functions
 * which can be passed things like a socket or binary data to process them
 * into JS objects or wrap the socket in async functions for easier integration.
 */
class NetworkAPI {

    /**
     *
     * @param {Object} app - the app Object. a catchall for global
     */
    constructor(app) {
        this.app = app;
        this.api_call_index = 0;
        this.api_callbacks = {};
    }


    //
    // Connect and Initialize
    //
    async wsConnectAndInitialize(protocol, host, port) {

	if (this.app.BROWSER == 1) { 
	  console.log("I am trying to connect now! We need a websocket in-browser.");
	  return; 
	}


        const WebSocket = require('ws');
        const ws = new WebSocket('http://127.0.0.1:3000/wsopen');

        ws.on('open', async (event) => {

            let init_handshake_message = Buffer.concat([
                new Uint8Array([127,0,0,1]),
                Base58.decode(this.app.wallet.returnPublicKey())
            ]);
            let handshake_init_response_data = await this.sendAPICall(ws, "SHAKINIT", init_handshake_message);
            let handshake_challenge = this.deserializeHandshakeChallenge(handshake_init_response_data);

            console.log(`${handshake_challenge.their_ip_octets[0]}.${handshake_challenge.their_ip_octets[1]}.${handshake_challenge.their_ip_octets[2]}.${handshake_challenge.their_ip_octets[3]}`);
            console.log(`${handshake_challenge.my_ip_octets[0]}.${handshake_challenge.my_ip_octets[1]}.${handshake_challenge.my_ip_octets[2]}.${handshake_challenge.my_ip_octets[3]}`);
            console.log(this.app.crypto.compressPublicKey(handshake_challenge.their_address));
            console.log(this.app.crypto.compressPublicKey(handshake_challenge.my_address));
            console.log(this.app.crypto.toBase58(handshake_challenge.their_sig));

            let is_sig_valid = secp256k1.verify(
                Buffer.from(blake3.hash(Buffer.from(handshake_init_response_data.slice(0, 82),'hex')),'hex'),
                handshake_challenge.their_sig,
                handshake_challenge.their_address
            );
            console.log(is_sig_valid);

            let { signature, recovery } = secp256k1.sign(
                Buffer.from(blake3.hash(handshake_init_response_data), 'hex'),
                Buffer.from(this.app.wallet.returnPrivateKey(), 'hex')
            );

            const bytes = Buffer.concat([
                handshake_init_response_data,
                signature
            ]);

            let handshake_complete_response_data = await this.sendAPICall(ws, "SHAKCOMP", bytes);

        });
        ws.on('message', (data) => {
            let api_message = this.deserializeAPIMessage(data);
            if (api_message.command === "RESULT__") {
                this.receiveAPIResponse(api_message);
            } else if (api_message.command === "ERROR___") {
                this.receiveAPIError(api_message);
            }
        });
        ws.on('error', (event) => {
            console.log(`[error] ${event.message}`);
        });
        ws.on('close', (event) => {
            console.log(`[close] Connection closed cleanly, code=${event.code} reason=${event.reason}`);
        });

        return ws;

    }








    /**
     * Initialization function. Sometimes needed if constructor is too early, i.e.
     * other parts of the system may not be ready yet.
     */
    initialize() {
        // Demo of how to connect to Rust here:
        // Disabling these, they are not meant to be shipped.
        if (!this.app.BROWSER) {
            console.log("Connect to Rust client!");
            this.wsConnectToRustPeer();
            console.log("Connect to Rust client!");
            this.getDemoBlockFromRust();
            console.log("Connect to Rust client!");
        }
    }

    /**
     * Async function. A simple mechanism for managing responses to messages sent over the socket.
     * Will keep track of the call index and automatically call resolve/response with a RESULT__
     * is sent back.
     *
     * @param {WebSocket} ws - a websocket
     * @param {array} command - 8-byte Array - the API command(remote procedure)
     * @param {array} message_bytes - byte Vector - the message to be passed to the procedure.
     * @returns
     */
    sendAPICall(ws, command, message_bytes) {
        return new Promise((resolve, reject) => {
            this.api_callbacks[this.api_call_index] = {
                resolve: resolve,
                reject: reject
            };
            let serialized_api_message = this.serializeAPIMessage(command, this.api_call_index, message_bytes);
            this.api_call_index += 1;
            ws.send(serialized_api_message);
        });
    }

    /**
     * When an API is received with special command "RESULT__", this
     * function is called and automatically dispatches the returned
     * data to the appropriate resolve().
     * @private
     * @param {array} bytes
     */
    receiveAPIResponse(api_message) {
        if(this.api_callbacks[api_message.index]) {
            this.api_callbacks[api_message.index].resolve(api_message.raw_message);
        } else {
            throw "response callback not found";
        }
    }
    /**
     * When an API is received with special command "ERROR___", this
     * function is called and automatically dispatches the returned
     * data to the appropriate reject().
     * @private
     * @param {array} bytes vector
     */
    receiveAPIError(bytes) {
        let index = this.app.binary.u32FromBytes(bytes.slice(8,12));
        if(this.api_callbacks[index]) {
            this.api_callbacks[index].reject(bytes.slice(12));
        } else {
            throw "error callback not found";
        }
    }
    /**
     * Creates a bytes array ready for the wire representing an API call.
     * @param {array} command - the remote prodecure to call
     * @param {number} index - the index of this call, similar to JSON RPC's "id"
     * @param {array} data - data to be sent
     * @returns array - bytes for the wire
     */
    serializeAPIMessage(command, index, data) {
        const enc = new TextEncoder();
        const command_bytes = enc.encode(command);
        const data_bytes = new Uint8Array(data);
        let index_as_bytes = this.app.binary.u32AsBytes(index);
        const bytes = new Uint8Array([
            ...command_bytes,
            ...index_as_bytes,
            ...data_bytes
        ]);
        return bytes;
    }
    /**
     * Creates an APIMessage Object from bytes sent over the wire
     *
     * @param {Uint8Array} bytes - raw bytes from the wire
     * @returns APIMessage
     */
    deserializeAPIMessage(bytes) {
        return {
            command: `${bytes.slice(0,8)}`,
            index: this.app.binary.u32FromBytes(bytes.slice(8,12)),
            raw_message: bytes.slice(12)
        }
    }
    /**
     * Deserialize handshake challenge from the wire
     * @param {array} buffer - raw bytes
     * @returns {HandshakeChallenge}
     */
    deserializeHandshakeChallenge(buffer) {
        let their_ip_octets = [];
        their_ip_octets[0] = buffer.readUInt8(0);
        their_ip_octets[1] = buffer.readUInt8(1);
        their_ip_octets[2] = buffer.readUInt8(2);
        their_ip_octets[3] = buffer.readUInt8(3);

        let my_ip_octets = [];
        my_ip_octets[0] = buffer.readUInt8(4);
        my_ip_octets[1] = buffer.readUInt8(5);
        my_ip_octets[2] = buffer.readUInt8(6);
        my_ip_octets[3] = buffer.readUInt8(7);

        let their_address = buffer.slice(8, 41);
        let my_address = buffer.slice(41, 74);
        let timestamp = buffer.slice(74, 82);
        let their_sig = buffer.slice(82, 146);
        return {
            their_ip_octets: their_ip_octets,
            my_ip_octets: my_ip_octets,
            their_address: their_address,
            my_address: my_address,
            timestamp: timestamp,
            their_sig: their_sig
        }
    }



    //
    // DEMO TEST FUNCTION, SHOULD BE REFACTORED
    //
    async wsConnectToRustPeer(protocol, host, port) {

        const WebSocket = require('ws');
        const ws = new WebSocket('http://127.0.0.1:3000/wsopen');

        ws.on('open', async (event) => {

console.log("initing rust Peer Socket");

            let init_handshake_message = Buffer.concat([
                new Uint8Array([127,0,0,1]),
                Base58.decode(this.app.wallet.returnPublicKey())
            ]);
            let handshake_init_response_data = await this.sendAPICall(ws, "SHAKINIT", init_handshake_message);
            let handshake_challenge = this.deserializeHandshakeChallenge(handshake_init_response_data);

            console.log(`${handshake_challenge.their_ip_octets[0]}.${handshake_challenge.their_ip_octets[1]}.${handshake_challenge.their_ip_octets[2]}.${handshake_challenge.their_ip_octets[3]}`);
            console.log(`${handshake_challenge.my_ip_octets[0]}.${handshake_challenge.my_ip_octets[1]}.${handshake_challenge.my_ip_octets[2]}.${handshake_challenge.my_ip_octets[3]}`);
            console.log(this.app.crypto.compressPublicKey(handshake_challenge.their_address));
            console.log(this.app.crypto.compressPublicKey(handshake_challenge.my_address));
            console.log(this.app.crypto.toBase58(handshake_challenge.their_sig));

            let is_sig_valid = secp256k1.verify(
                Buffer.from(blake3.hash(Buffer.from(handshake_init_response_data.slice(0, 82),'hex')),'hex'),
                handshake_challenge.their_sig,
                handshake_challenge.their_address
            );
            console.log(is_sig_valid);

            let { signature, recovery } = secp256k1.sign(
                Buffer.from(blake3.hash(handshake_init_response_data), 'hex'),
                Buffer.from(this.app.wallet.returnPrivateKey(), 'hex')
            );

            const bytes = Buffer.concat([
                handshake_init_response_data,
                signature
            ]);

            let handshake_complete_response_data = await this.sendAPICall(ws, "SHAKCOMP", bytes);

console.log("handshake complete");

        });
        ws.on('message', (data) => {
            let api_message = this.deserializeAPIMessage(data);
            if (api_message.command === "RESULT__") {
                this.receiveAPIResponse(api_message);
            } else if (api_message.command === "ERROR___") {
                this.receiveAPIError(api_message);
            }
        });
        ws.on('error', (event) => {
            console.log(`[error] ${event.message}`);
        });
        ws.on('close', (event) => {
            console.log(`[close] Connection closed cleanly, code=${event.code} reason=${event.reason}`);
        });
    }


    //
    // DEMO TEST FUNCTION, SHOULD BE REFACTORED
    //
    async getDemoBlockFromRust() {
        const fetch = require('node-fetch');
        try {
            const url = `http://127.0.0.1:3000/block/403fa38a30aa0028f3d7020c4856474eaaf4e6e9b8346142ee83624352ae069d`;
            const res = await fetch(url);
            if (res.ok) {
                const buffer = await res.buffer();
                let block = new saito.block(this.app);
		block.deserialize(buffer);
                console.log(`GOT BLOCK ${block.id} ${block.timestamp}`)
            } else {
                console.log(`Error fetching block: Status ${res.status} -- ${res.statusText}`);
            }
        } catch(err) {
            console.log(`Error fetching block: ${err}`);
        }
    }
}


module.exports = NetworkAPI;