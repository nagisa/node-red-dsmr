import { NodeInitializer, NodeConstructor, Node, NodeDef } from "node-red";
import { DsmrOptions } from "./dsmr_types";
import { crc16 } from "crc";

interface DsmrNode extends Node<{}> {
    buffer: string,
}
interface DsmrProps extends NodeDef, DsmrOptions { }

const init: NodeInitializer = (RED) => {
    RED.nodes.registerType("dsmr", function(this: DsmrNode, props: DsmrProps) {
        RED.nodes.createNode(this, props);
        this.buffer = "";
        const cosemSplitPattern = /[()]{1,2}/;
        this.on("input", (msg, send, done) => {
            let payload = RED.util.getMessageProperty(msg, props.property);
            if (payload instanceof Array) {
                payload = Uint8Array.from(payload, (n) => n > 0xFF ? 0 : n);
            }
            if (payload instanceof String) {
                this.buffer += payload;
            } else if (payload instanceof Uint8Array) {
                this.buffer += new TextDecoder('ascii').decode(payload);
            } else {
                return done(Error("DSMR node can only handle strings or arrays of bytes"));
            };

            // We've pretty much did all the work to get the data so far, so might as well give it
            // a shot at parsing this and pushing it along, even if the buffer now exceeds the
            // maximum configured length.
            const truncate_buffer = true;
            if (this.buffer.length >= props.maximumTelegram) {
                this.warn(`buffer at ${this.buffer.length} bytes exceeds the limit, but trying to parse it at least once anyway`);
            }

            let previous_length;
            do {
                previous_length = this.buffer.length;
                const [telegram, telegram_tail, ...remainders] = this.buffer.split("\r\n!");
                if (telegram_tail === undefined) {
                    // CRC not available yet.
                    if (this.buffer.length >= props.maximumTelegram) {
                        this.warn(`did not receive a well formed telegram within ${props.maximumTelegram} bytes of payload`);
                        this.buffer = "";
                    }
                    return done();
                }
                // Update the buffer with the remainder we're not looking at. From this point on
                // the control flow is particularly simple -- we can simply `continue` to move on
                // to the "next" potential telegram.
                const [crc, ...crc_tail] = telegram_tail.split("\r\n");
                if (crc_tail.length != 0) remainders.unshift(crc_tail.join("\r\n"));
                this.buffer = remainders.join("\r\n!");

                if (crc.length != 4) continue;
                let parsed_crc = parseInt("F" + crc, 16);
                // Make sure all digits in the original string were consumed by parseInt
                if ((parsed_crc & 0xF0000) != 0xF0000) continue;
                parsed_crc &= 0xFFFF;

                let computed_crc = crc16(telegram);
                computed_crc = crc16("\r\n!", computed_crc);

                if (computed_crc != parsed_crc) {
                    this.warn(`CRC mismatch: computed=${computed_crc.toString(16)}, parsed=${parsed_crc.toString(16)}`);
                    continue;
                }

                const [identifier, empty, ...cosem_objects] = telegram.split("\r\n");
                let structured_payload: Record<string, string|string[]> = {
                    vendor: identifier.slice(1, 4),
                    identification: identifier.slice(5),
                };
                for (const obj of cosem_objects) {
                    // COSEM objects can be one of these shapes:
                    // ID '(' VALUE ('*' UNIT)? ')'
                    // ID '(' TIMESTAMP ')(' VALUE ('*' UNIT)? ')'
                    // ID '(' COUNT ')(' ID ')(' TIMESTAMP ')(' VALUE ...
                    //
                    // For the last one I'm not quite sure if there are COUNT TIMESTAMP-VALUE pairs
                    // or just the most recent and the oldest one. The specification is extremely
                    // ambiguous on that point and my meter does not send any log objects
                    //
                    // Anyhow, we just don't try to interpret these at all, just like we don't
                    // attempt to prescribe any meaning to the OBIS codes. Doing this part should
                    // be reasonably straightforward to anybody with a function node and the get an
                    // opportunity to shape the data in precisely the way that suits them best.
                    const [obis, ...value] = obj.split(cosemSplitPattern).filter((n) => n);
                    structured_payload[obis] = value;
                }
                RED.util.setMessageProperty(msg, props.property, structured_payload)
                send(msg);

                // Keep parsing telegrams out of the buffer for as long as doing so makes
                // progress.
            } while (this.buffer.length != previous_length);
            return done();
        });
    })
};

export = init;
