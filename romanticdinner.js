"use strict";
// romanticdinner.js
//
//  todo:...
// populate browser back history on next/prev
// check for submit errors
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
      this.pages = ["home", "choices1", "choices2", "go", "final"];
      this.pageId = "home";
      this.items = {};
   }

   InitEvents() {
      $(".next").click(()=> this.NextPage());
      $(".prev").click(()=> this.PrevPage());
      $("input[type='text']").on("input", ()=> this.NameChange());
      $("select").on("change", (e)=> this.SelectChange(e));
      $("form").submit((e)=> this.DoSubmit(e));
      $("header img").click(()=>{this.ShowPage("home")});
   }

   async InitState() {
      await this.LoadItems();
      this.PopulateItems();
      this.ShowPage("home");

      // the chosen plugin can be pretty intrusive. undo the fixed sizing
      $(".chosen-container").attr("style", "");
   }

   NameChange() {
      let guest1 = $("input.guest1").val().replace(/</g, "&lt;").replace(/>/g, "&gt;");
      let guest2 = $("input.guest2").val().replace(/</g, "&lt;").replace(/>/g, "&gt;");
      $("span.guest1").text(guest1);
      $("span.guest2").text(guest2);
      $("#home button").disableIt(!(guest1 && guest2));
   }

   SelectChange(e) {
      console.log ("selectchange");
      let content = $(e.target).closest(".content");
      let ok = true;
      content.find("select").each((i, el)=>{
         ok &&= $(el).val();
      });
      content.find("button.next").disableIt(!ok);
   }

   NextPage () {this.ShowNext(1)}
   PrevPage () {this.ShowNext(-1)}
                   
   ShowNext(idx) {
      let currId = $(".content.visiblewafen").attr("id");
      let nextIdx = (this.pages.indexOf(currId) + idx + this.pages.length) % this.pages.length;
      this.ShowPage(this.pages[nextIdx]);
   };

   ShowPage(pageId) {
      this.pageId = pageId;

      $(".content").removeClass("visiblewafen").addClass("hiddenwafen");
      $(`#${pageId}`).removeClass("hiddenwafen").addClass("visiblewafen");      
   }

   async LoadItems() {
      this.ShowSpinner(true);
      let response = await fetch(`${this.dataUrl}/items`);
      let itemHash = await response.json();
      this.items = itemHash.items;

      this.ShowSpinner(false);
   }

   PopulateItems() {
      $("select").append($("<option value=''>"));
      for (let item of this.items) {
         let parent = $(`.${item.type}`);
         if (!parent.length) {
            $(`.Entree`).append($("<optgroup>").addClass(item.type).attr("label", item.type));
            parent = $(`.${item.type}`);
         }
         parent.append($("<option>").text(item.description).attr("value", item.description));
      }
      $('select').chosen({disable_search_threshold: 50});
   }

   async DoSubmit(e) {
      e.preventDefault();
      $("button[type='submit']").disableIt(true);
      this.ShowSpinner(true);

      let data = {};
      $("select,input").each((i, el)=>{
         data[el.name] = el.value;
      });
      let body = JSON.stringify(data);
      let headers = {'Accept': 'application/json', 'Content-Type': 'application/json'};
      let response = await fetch(`${this.dataUrl}/menus`, {method:"post", headers, body});
      this.ShowSpinner(false);
      if (!response.ok) {
         window.alert("Sorry! The server seems to be down for maintenance or broken. Please try again later.");
         return;
      }
      this.NextPage();
      return 0;
   }

   ShowSpinner(show) {
      $(".spinner").showIt(show);
   }
}
