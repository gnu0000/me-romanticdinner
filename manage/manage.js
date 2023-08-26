"use strict";

// manage.js
//
//  todo:...
//    table col widths
//
// Craig Fitzgerald 2023


$(function() {
   let p = new PageHandler();
});

class PageHandler {
   constructor() {
      this.AddExtensions();
      this.InitAttributes();
      this.InitEvents();
      this.InitState();
   }

   AddExtensions() {
      $.fn.showIt = function(show) {
         return (show ? this.show() : this.hide());
      };
      $.fn.disableIt = function(disable) {
         return this.prop("disabled", disable);
      };
   }

   InitAttributes() {
      this.dataUrl = "/cgi-bin/romanticdinner.pl";
      this.headers = {'Accept': 'application/json', 'Content-Type': 'application/json'};
      this.pages = ["menus", "menu", "items", "about"];
      this.pageId = "menus";
      this.menus = [];
      this.menuHash = {};
      this.menu  = {};
      this.items = [];
      this.editInitialized = false;
   }

   InitEvents() {
      $("#menus tbody").on("click", "td:nth-child(1), td:nth-child(2), td:nth-child(3)", (e)=>this.MenuSelected(e));
      $("#menus tbody").on("click", "td:nth-child(4)", (e)=>this.DeleteMenu(e));
      $("button.back" ).on("click", ()=>{this.ShowPage("menus")});
      $("button.print").on("click", ()=>{window.print();return false;});
      $(".logo"       ).on("click", ()=>{this.ShowPage("menus")});
      $("#editlink"   ).on("click", ()=>{this.ShowPage("items")});
      $("#aboutlink"  ).on("click", ()=>{this.ShowPage("about")});

      $("#items").on("click", "h2 img"                , (e)=>{this.AddItem   (e)});
      $("#items").on("click", ".item img:nth-child(1)", (e)=>{this.EditItem  (e)});
      $("#items").on("click", ".item img:nth-child(2)", (e)=>{this.DeleteItem(e)});
      $("#items").on("click", "button.saveform"       , (e)=>{this.SaveItem  (e)});
      $("#items").on("click", "button.cancelform"     , (e)=>{this.CancelItem(e)});
   }

   async InitState() {
      this.ShowPage("menus");
      this.ShowSpinner(true);
      this.StashTemplates();
      await this.LoadMenus();
      this.PopulateMenus();
      this.ShowSpinner(false);
   }

   async InitItemsPage() {
      if (this.editInitialized) return;
      this.ShowSpinner(true);
      await this.LoadItems();
      this.PopulateItems();
      this.ShowSpinner(false);
      this.editInitialized = true;
   }

   ShowPage(pageId) {
      this.pageId = pageId;
      $(".content.visible").removeClass("visible").addClass("hidden");
      var page = $("#" + pageId).addClass("visible").removeClass("hidden");

      if (pageId == "items") this.InitItemsPage();
   }

   async LoadMenus() {
      let response = await fetch(`${this.dataUrl}/menu`);
      let menuHash = await response.json();
      this.menus = menuHash.menus;

      this.menuHash = {};
      this.menus.map((m)=>{this.menuHash[m.id] = m});
   }

   async LoadItems() {
      let response = await fetch(`${this.dataUrl}/item`);
      let itemHash = await response.json();
      this.items = itemHash.items;

      this.itemHash = {};
      for (let item of this.items) {
         if (!this.itemHash[item.type]) this.itemHash[item.type] = [];
         this.itemHash[item.type].push(item);
      }
   }

   PopulateMenus() {
      let parent = $("#menus tbody");
      parent.empty();
      for (let menu of this.menus) {
         let data = JSON.parse(menu.data);
         menu.eventdate = data.date;
         menu.eventtime = data.time;
         parent.append(this.Template("menurow", menu));
      }
   }

   PopulateItems() {
      for (let groupName in this.itemHash) {
         let parent = $("#items .editarea");
         parent.append(this.Template("edititems", {groupName}));
         parent = parent.find(".items:last-of-type");
         for (let item of this.itemHash[groupName]) {
            parent.append(this.Template("edititem", item));
         }
      }
   }

   MenuSelected(e) {
      let parent = $("#menu .details");
      let menuid = $(e.target).closest("tr").data("rowid");
      let menu = this.menuHash[menuid];
      menu = Object.assign(menu, JSON.parse(menu.data));

      parent.empty().append(this.Template("menudetails", menu));
      this.ShowPage("menu");
      }

   async DeleteMenu(e) {
      let parent = $("#menu .details");
      let row    = $(e.target).closest("tr");
      let menuid = row.data("rowid");
      let menu = this.menuHash[menuid];

      if (!confirm(`Delete menu for ${menu.label}?`))
         return;

      this.ShowSpinner(true);
      let response = await fetch(`${this.dataUrl}/menu/${menu.id}`, {method:"delete", headers:this.headers});
      this.ShowSpinner(false);
      if (!response.ok) return this.ShowServerError(response);
      row.remove();
   }

   AddItem(e) {
      let group = $(e.target).closest(".items").data("group");
      this.CreateForm($(e.target).parent(), "", group, "");
   };

   EditItem(e) {
      let item  = $(e.target).closest(".item");
      let id    = item.data("itemid");
      let group = item.closest(".items").data("group");
      let desc  = item.find("span").text();

      this.CreateForm(item, id, group, desc);
   }

   async DeleteItem(e) {
      let item = $(e.target).closest(".item");
      let id   = item.data("itemid");
      let desc = item.find("span").text();

      if (!confirm("Delete item '"+desc+"' ?")) return;
      let response = await fetch(`${this.dataUrl}/item/${id}`, {method:"delete", headers:this.headers});
      this.ShowSpinner(false);
      if (!response.ok) return this.ShowServerError(response);
      item.remove();
   }

   CreateForm(parent, id, group, desc) {
      let form = this.Template("editform", {id, group, desc});
      parent.append(form);
      return form;
   }

   async SaveItem(e) {
      console.log("save item");
      let form        = $(e.target).closest(".editform");
      let type        = form.data("group");
      let id          = form.data("id");
      let description = form.find("textarea").val();
      let body        = JSON.stringify({id, type, description});
      
      if (id) { // an edit (as opposed to a new item)
         let response = await fetch(`${this.dataUrl}/item/${id}`, {method:"put", headers:this.headers, body});
         this.ShowSpinner(false);
         form.remove();
         if (!response.ok) return this.ShowServerError(response);
         $(`.item[data-itemid='${id}'] span`).text(description);
         return; 
      }
      let response = await fetch(`${this.dataUrl}/item/${id}`, {method:"post", headers:this.headers, body});
      this.ShowSpinner(false);
      form.remove();
      if (!response.ok) return this.ShowServerError(response);
      let data = await response.json();
      let parent = $(`.items[data-group='${type}']`);
      parent.append(this.Template("edititem", {id:data.id, description}));
   }

   CancelItem(e) {
      $(e.target).closest(".editform").remove();
   }

   StashTemplates() {
      this.templates = {};
      $("template").each((i, node) => {
         node = $(node);
         this.templates[node.attr("id")] = node.detach();
      });
   }

   ShowServerError(response) {
      // todo: give info
      window.alert("Sorry! The server seems to be down for maintenance or broken. Please try again later.");
   }

   Template(name, data) {
      let html = this.templates[name].html();
      html = html.replace(/{.+?}/g, (m) => {
         return data[m.match(/{(.+)}/)[1]]
      });
      return $(html);
   }

   ShowSpinner(show) {
      $(".spinner").showIt(show);
   }
}
