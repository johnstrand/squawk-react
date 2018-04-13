using Microsoft.AspNetCore.Mvc;

namespace example.Controllers
{
    public class HomeController : Controller
    {
        public IActionResult Index()
        {
            return View();
        }
    }
}
