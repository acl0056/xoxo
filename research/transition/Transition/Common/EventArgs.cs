using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Easycoustics.Transition.Common
{
    public class ValueChangedEventArgs : EventArgs
    {
        public object oldValue { get; set; }
        public object newValue { get; set; }
        public string PropertyName { get; set; }
    }
}
