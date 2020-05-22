import amqp, { Options, Connection, Replies } from "amqplib";
import Config from "./Config";
import { singleton, injectable } from "tsyringe";
import { AMQP_HOST, AMQP_PORT, AMQP_USERNAME, AMQP_PASSWORD, AMQP_INPUT_ASSET_QUEUE } from "@/constants/config";
import Logger from "./Logger";
import { ec, ic } from "@/constants/logging";
import { amqpHanderFn } from "@/interfaces";

@singleton()
@injectable()
export default class Amqp {
  private config: Config;
  private logger: Logger;

  constructor(config: Config, logger: Logger) {
    this.config = config;
    this.logger = logger;
  }

  /**
   * Connects to AMQP server, waits for messae in the specified queue and process the message  using the handler function
   * @param queueName Name of the queue to receive message from
   * @param handlerFn function that need to be executed when a message is received.
   */
  public async consumeMessage(queueName: string, handlerFn: amqpHanderFn): Promise<Replies.Consume> {
    const self = this;
    try {
      const connction = await this.getConnection();
      self.logger.info(ic.amqp_connection_established, { code: ic.amqp_connection_established });
      process.once("SIGINT", function () {
        self.logger.info(ic.amqp_connection_closing, { code: ic.amqp_connection_closing });
        connction.close();
      });
      const ch = await connction.createChannel();
      await ch.assertQueue(queueName, { durable: true });
      return ch.consume(queueName, async (msg) => {
        if (msg) {
          self.logger.info(ic.amqp_message_received, { code: ic.amqp_message_received, msg });
          await handlerFn(msg);
          ch.ack(msg);
          self.logger.info(ic.amqp_message_acked, { code: ic.amqp_message_acked, msg });
        }
      });
    } catch (err) {
      self.logger.error(err, { code: ec.amqp_connection_error });
      throw err;
    }
  }

  /**
   * returns the connection params for AMQP
   */
  private getConnectionParams(): Options.Connect {
    return <Options.Connect>{
      protocol: "amqp",
      hostname: this.config.get(AMQP_HOST, "localhost"),
      port: parseInt(this.config.get(AMQP_PORT, 5672)),
      username: this.config.get(AMQP_USERNAME, "guest"),
      password: this.config.get(AMQP_PASSWORD, "guest"),
    };
  }

  /**
   * returns AMQP connection object
   */
  private getConnection(): Promise<Connection> {
    const connectionParams = this.getConnectionParams();
    return amqp.connect(connectionParams);
  }
}
