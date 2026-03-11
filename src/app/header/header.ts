import { Component, inject } from "@angular/core";
import { SelectButtonModule } from "primeng/selectbutton";
import { DOCUMENT } from "@angular/common";
import { FormsModule } from "@angular/forms";

@Component({
  selector: "app-header",
  imports: [FormsModule, SelectButtonModule],
  templateUrl: "./header.html",
  styleUrl: "./header.css",
})
export class Header {}
