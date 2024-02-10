var amqp = require("amqplib/callback_api");

// Connect to RabbitMQ server
amqp.connect("amqp://localhost", function (error0, connection) {
  if (error0) {
    throw error0;
  }
  // Create a channel
  connection.createChannel(function (error1, channel) {
    if (error1) {
      throw error1;
    }

    var exchange = "direct_logs";
    var args = process.argv.slice(2);
    var msg = args.slice(1).join(" ") || "Hello World!";
    var severity = args.length > 0 ? args[0] : "info";

    channel.assertExchange(exchange, "direct", {
      durable: false,
    });
    channel.publish(exchange, severity, Buffer.from(msg));
    console.log(" [x] Sent %s: '%s'", severity, msg);
  });

  setTimeout(function () {
    connection.close();
    process.exit(0);
  }, 500);
});

// Receiver code
var amqp = require("amqplib/callback_api");

amqp.connect("amqp://localhost", function (error0, connection) {
  if (error0) {
    throw error0;
  }
  connection.createChannel(function (error1, channel) {
    if (error1) {
      throw error1;
    }
    var exchange = "direct_logs";

    channel.assertExchange(exchange, "direct", {
      durable: false,
    });

    channel.assertQueue(
      "",
      {
        exclusive: true,
      },
      function (error2, q) {
        if (error2) {
          throw error2;
        }
        console.log(
          " [*] Waiting for messages in %s. To exit press CTRL+C",
          q.queue
        );

        var args = process.argv.slice(2);
        var severity = args.length > 0 ? args[0] : "info";

        channel.bindQueue(q.queue, exchange, severity);

        channel.consume(
          q.queue,
          function (msg) {
            console.log(
              " [x] %s: '%s'",
              msg.fields.routingKey,
              msg.content.toString()
            );
          },
          {
            noAck: true,
          }
        );
      }
    );
  });
});
