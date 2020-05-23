import "reflect-metadata";
import { container } from "tsyringe";
import "@/register";
import App from "@/App";

const app = container.resolve<App>(App);
app.start();
