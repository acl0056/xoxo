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
    class CommandAddComponent : ICircuitCommand
    {
        public SerializableComponent Component { get; set; }

        public string Title => "Add Component Command: " + Component.ToString();

       // public bool AlterSchematic => true;

        public CommandType CommandType => CommandType.ReBuildAndCalculate;

        public override string ToString() => Title;

        

        public void execute()
        {
            UserDesign.CurrentDesign.Components.Add(Component);
        }

        public void unExecute()
        {
            UserDesign.CurrentDesign.Components.Remove(Component);
        }

        
    }
}
