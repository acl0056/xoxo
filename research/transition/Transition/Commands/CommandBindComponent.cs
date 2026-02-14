using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using Easycoustics.Transition.CircuitEditor;
using Easycoustics.Transition.CircuitEditor.OnScreenComponents;
using Easycoustics.Transition.CircuitEditor.Serializable;
using Easycoustics.Transition.Common;
using Easycoustics.Transition.Design;

namespace Easycoustics.Transition.Commands
{
    public class CommandBindComponent : ICircuitCommand
    {
        public string Title => "Command Bind Component";

        public SerializableComponent Component { get; set; }

        private List<SerializableWire> wiresForComponents = new List<SerializableWire>();
        private Dictionary<byte, ElementTerminal> binds;
        public CommandType CommandType => CommandType.ReBuildAndCalculate;

        public void execute()
        {
            foreach (SerializableWire wire in wiresForComponents)
                UserDesign.CurrentDesign.Wires.Add(wire);
          
        }

        public void unExecute()
        {
            foreach (SerializableWire wire in wiresForComponents)
                UserDesign.CurrentDesign.Wires.Remove(wire);
          
        }

        public CommandBindComponent(Dictionary<byte, ElementTerminal> binds, SerializableComponent comp)
        {
            Component = comp;
            this.binds = binds;
            
            SerializableWire wire;

            foreach (KeyValuePair<byte, ElementTerminal> bind in binds)
            { 
                wire = UserDesign.CurrentDesign.bindComponentTerminal(comp, bind.Key, bind.Value.ScreenElement.Serializable, bind.Value.TerminalNumber);
                if (wire != null) wiresForComponents.Add(wire);
            }
        }
    }
}
