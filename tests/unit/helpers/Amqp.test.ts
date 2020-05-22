import "reflect-metadata";
import { container } from "tsyringe";
import { mockLogger, getMockConfig } from "@tests/testUtils";
import Config from "@/helpers/Config";
import Amqp from "@/helpers/Amqp";
import mockAmqplib from "mock-amqplib";
import sinon from "sinon";
import amqpOriginalLib from "amqplib";

/**
 * @group unit/helper/Amqp
 */
describe("AMQP helper", () => {
  beforeAll(() => {
    mockLogger();
    const configMock = getMockConfig({
      amqp: {
        host: "localhost",
        port: "5672",
        username: "guest",
        password: "guest",
        queues: {
          inputAssetQueue: "task_queue",
        },
      },
    });
    //@ts-ignore
    container.registerInstance(Config, configMock);
  });

  afterEach(() => {
    sinon.restore();
  });
  test("amqp lib consume", async () => {
    const queueName = "task_queue";
    const amqp = container.resolve<Amqp>(Amqp);

    const mockAmqpConnection = await mockAmqplib.connect("something");
    const channel = await mockAmqpConnection.createChannel();
    await channel.assertQueue(queueName, { durable: true });
    await channel.sendToQueue(queueName, "test-content1");

    // sinon.stub(amqp, <any>"getConnection").returns(mockAmqpConnection);
    sinon.stub(amqpOriginalLib, "connect").returns(mockAmqpConnection);
    const handlerFn = jest.fn();

    const { consumerTag } = await amqp.consumeMessage(queueName, handlerFn);

    await channel.sendToQueue(queueName, "test-content2");
    await channel.cancel(consumerTag);

    expect(handlerFn).toBeCalled();
  });

  test("throws conenction failure error", async () => {
    const amqp = container.resolve<Amqp>(Amqp);
    sinon.stub(amqp, <any>"getConnection").rejects("Connection error");
    expect(amqp.consumeMessage("some-queue", jest.fn())).rejects.toThrowError();
  });
});
