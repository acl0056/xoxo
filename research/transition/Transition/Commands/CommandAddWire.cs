using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using Easycoustics.Transition.CircuitEditor;
using Easycoustics.Transition.CircuitEditor.Serializable;
using Easycoustics.Transition.Common;
using Easycoustics.Transition.Design;

namespace Easycoustics.Transition.Commands
{
    public class CommandAddWire : ICircuitCommand
    {
        public string Title => "Add Wire Command: " + Wire.ToString();

        public SerializableWire Wire { get; set; }
        public CommandType CommandType => CommandType.ReBuildAndCalculate;

        public override string ToString() => Title;

        public void execute()
        {
            UserDesign.CurrentDesign.Wires.Add(Wire);
        }

        public void unExecute()
        {
            UserDesign.CurrentDesign.Wires.Remove(Wire);
        }


    }
}
