using StocksBetWebApps.Models;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;
using System.Web.Mvc;


namespace StocksBetWebApps.Controllers
{
    public class SpreadBettingController : Controller
    {
        public ActionResult Index(string id)
        {
            if (id != null)
            {
                var model = new Instrument(id);

                ViewBag.RefrashURL = "/SpreadBetting/" + model.Code;
                ViewBag.Title = model.CompanyName + " Stock Price Spread Betting";

                ViewBag.Symbol = model.Code;
                ViewBag.CompanyName = model.CompanyName;
                ViewBag.Exchange = model.Exchange;
                ViewBag.Industry = model.Industry;
                ViewBag.Website = model.Website;
                ViewBag.Description = model.Description;
                ViewBag.CEO = model.CEO;
                ViewBag.IssueType = model.IssueType;
                ViewBag.Sector = model.Sector;
                ViewBag.LogoUrl = model.LogoUrl;

            } else {
                var model = new Instrument();
                ViewBag.Title = "Spread Betting on Stock market";

                ViewBag.InstrumentList = model.GetList();
            }

            return View();
        }
    }
}