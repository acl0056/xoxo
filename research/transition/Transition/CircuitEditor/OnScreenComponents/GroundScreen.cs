using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using Easycoustics.Transition.CircuitEditor.Serializable;
using Windows.UI.Xaml;
using Windows.UI.Xaml.Controls;

namespace Easycoustics.Transition.CircuitEditor.OnScreenComponents
{
    public class GroundScreen : ScreenComponentBase
    {
        public override double SchematicWidth => 80;
        public override double SchematicHeight => 80;

        public override int[,] TerminalPositions
        {
            get => new int[,] { { 40, 20 } };
        }
        public ContentControl SymbolInductor { get; }

        public GroundScreen(Ground ground) : base(ground)
        {
            SymbolInductor = new ContentControl()
            {
                ContentTemplate = (DataTemplate)Application.Current.Resources["symbolGround"]
            };

            ComponentCanvas.Children.Add(SymbolInductor);
            Canvas.SetTop(SymbolInductor, 19);
            Canvas.SetLeft(SymbolInductor, 19);

            postConstruct();
        }

        public override void setPositionTextBoxes(SerializableElement el)
        {
          
        }
    }
}
