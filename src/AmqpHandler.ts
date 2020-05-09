import amqp from "amqplib";

export default class AmqpHandler {
  public static consumeMessage(queueName: string, handlerFn: Function) {
    amqp
      .connect("amqp://localhost")
      .then(async function (conn) {
        process.once("SIGINT", function () {
          conn.close();
        });
        const ch = await conn.createChannel();
        var ok = ch.assertQueue(queueName, { durable: true });
        ok.then(function (_qok) {
          return ch.consume(
            queueName,
            async (msg) => {
              if (msg) {
                await handlerFn(msg);
                ch.ack(msg);
              }
            },
            { noAck: false }
          );
        });
        const _consumeOk = await ok;
        console.log(" [*] Waiting for messages. To exit press CTRL+C");
      })
      .catch(console.error);
  }
}
