import { EditorRED, EditorNodeProperties } from "node-red";
import { DsmrOptions } from "../dsmr_types";

declare const RED: EditorRED;

interface DsmrEditorNodeProperties extends EditorNodeProperties, DsmrOptions {}

RED.nodes.registerType<DsmrEditorNodeProperties>("dsmr", {
    category: 'parser',
    color: 'rgb(222, 189, 92)',
    defaults: {
        name: { value: "" },
        property: {
           value: "payload", required: true,
           // @ts-ignore
           label: RED._("node-red:common.label.property"),
           // @ts-ignore
           validate: RED.validators.typedInput({ type: 'msg', allowBlank: true })
        },
        maximumTelegram: { value: 10240 },
    },
    inputs: 1,
    outputs: 1,
    icon: "font-awesome/fa-bolt",
    label: function() {
        return this.name||"dsmr";
    },
    oneditprepare: function() {
        if (this.property === undefined) {
            $("#node-input-property").val("payload");
        }
        $("#node-input-property").typedInput({default:'msg',types:['msg']});
    }
});
