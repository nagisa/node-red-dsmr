<div align="center">
  <h1><code>node-red-contrib-dsmr</code></h1>

  <p>
    <strong>A node to give some structure to a stream of DSMR data</strong>
  </p>

</div>

This package provides a single node for the [node-red](https://nodered.org) project. The node
consumes a stream of DSMR data such as what might be obtained from an electricity meter over
its P1 port over serial or TCP connection, frames it and gives the data a little bit of
structure.

Unlike many other implementations of DSMR parsers, this one does not attempt to prescribe
meaning to any specific COSEM object, nor does it attempt to figure out the type of
specific values. This is best achieved by piping the output of this node to the follow up
function node and transforming the data in whatever way is appropriate to your use-case.

Instead the output payload will be replaced with an object along the lines of

```json
{
  "vendor": "ABC",
  "identifier": "USUALLY_SN",
  "0-0:1.0.0": ["240218021712W"],
  "1-0:1.8.0": ["00001234.567*kWh"],
  ...
}
```

The value for each COSEM object may have more than a single element. This is especially
relevant for readings sourced from M-BUS devices or objects representing logs.

It is up to the user to apply meaning to the OBIS keys. Your utility should have
documentation on their website explaining the data model of their DSMR telegrams. Obtain it
in order to apply meaning to the OBIS codes you get in the payloads after processing.

If you're interested in the specifics of the format, refer to the [P1 Companion Standard][std].

[std]: https://www.netbeheernederland.nl/_upload/Files/Slimme_meter_15_a727fce1f1.pdf
