using System;
using System.Collections.Generic;
using System.Collections.ObjectModel;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using Easycoustics.Transition.Functions;

namespace Easycoustics.Transition.CurveLibrary
{
    public class LibraryItem : LibraryBase
    {
        public Function Curve { get; set; }

        public override string Title
        {
            get
            {
                return (Curve != null) ? Curve.Title : "";
            }
        }

        public override ObservableCollection<LibraryBase> Children => null;

        public override LibraryItem GetItem(Function func)
        {
            return (Curve == func) ? this : null; 
        }

        public override void submitCurvesChange()
        {
            Curve.RaiseFunctionChanged(new FunctionChangedEventArgs() {Action=FunctionChangedEventArgs.FunctionChangeAction.Reset });
        }
    }
}
