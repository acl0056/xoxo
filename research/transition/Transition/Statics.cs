using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Easycoustics.Transition
{
    public static class Statics
    {
        public static double round20(double input)
        {
            int x = (int)(input / 20);
            return x * 20;
        }
    }
}
